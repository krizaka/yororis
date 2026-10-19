// The voice of the Moment: the person's recording goes to Orazaka's voice turn, the presence's sentences come back as clips
// served through our own door, and a clip is only ever the edge's own signed address.
import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const { createOrazakaClient, useOrazakaClient, isClipPath, clipHref, parseTurn } = await import("../lib/orazaka.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");
const clip = await import("../app/api/moment/clip/route.ts");
const { MAX_AUDIO_BYTES } = await import("../lib/moment-api.ts");

const CLIP = "/api/v1/voice/clips/3f2a9c1e-7b1d-4c55-9a0e-0123456789ab?expires=1792300000&signature=abcDEF0123456789_-abcDEF0123456789";
const sse = (events) => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");

function engine(over = {}) {
  const calls = [];
  const clips = [];
  return {
    calls,
    clips,
    async installation() {
      return "inst-voice";
    },
    async turn(input) {
      calls.push(input);
      if (over.turn) return over.turn(input);
      return {
        transcript: input.audio ? "Work was heavy this week" : null,
        sentences: [{ index: 0, text: "I hear you.", audio: { url: CLIP, durationMs: 1200, contentType: "audio/wav", voice: "piper-en-low", locale: "en" } }],
        crisis: null,
        declined: null,
      };
    },
    async clip(path) {
      clips.push(path);
      return over.clip ? over.clip(path) : new Response(new Uint8Array([82, 73, 70, 70]), { headers: { "content-type": "audio/wav" } });
    },
  };
}

const HOST = "127.0.0.1:3400";
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n) => `yororis_auth=${issue(ID(n))}`;
const headers = (cookie) => ({ host: HOST, origin: `http://${HOST}`, cookie });
const json = (handler, path, body, cookie = as(2)) => handler.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { ...headers(cookie), "content-type": "application/json" }, body: JSON.stringify(body) }));
const speak = (momentId, blob, cookie = as(2)) => {
  const form = new FormData();
  form.set("momentId", momentId);
  if (blob) form.set("audio", blob, "moment");
  return turn.POST(new Request(`http://${HOST}/api/moment/turn`, { method: "POST", headers: headers(cookie), body: form }));
};
const open = async () => (await (await json(start, "/api/moment/start", { presence: "lea", language: "en", agreed: true })).json()).moment.id;
const wav = (bytes = 2000, type = "audio/webm;codecs=opus") => new Blob([new Uint8Array(bytes)], { type });

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  useOrazakaClient(engine());
});
test.after(() => useOrazakaClient(undefined));

test("a clip address is the edge's own signed path, nothing else", () => {
  assert.equal(isClipPath(CLIP), true);
  for (const bad of ["/api/v1/voice/clips/x", "/api/v1/chat?expires=1792300000&signature=abcDEF0123456789_-", `${CLIP}&x=1`, `/../${CLIP}`, `https://evil.example${CLIP}`, "//evil.example/api/v1/voice/clips/3f2a9c1e-7b1d?expires=1792300000&signature=abcDEF0123456789_-abc", ""]) {
    assert.equal(isClipPath(bad), false, bad);
  }
  assert.equal(clipHref(CLIP), `/api/moment/clip?p=${encodeURIComponent(CLIP)}`);
  assert.equal(clipHref(`https://edge.example.test${CLIP}`), `/api/moment/clip?p=${encodeURIComponent(CLIP)}`, "an absolute address is reduced to its path");
  assert.equal(clipHref("https://evil.example/elsewhere"), null);
});

test("the client sends a recording as the audio part, not as text", async () => {
  const seen = [];
  const fake = async (url, init) => {
    seen.push({ url: String(url), body: init.body, auth: init.headers?.authorization });
    if (String(url).endsWith("/api/v1/studios/installations")) return Response.json([{ id: "inst-1", studioKey: "guided-journaling" }]);
    return new Response(sse([["transcript", { text: "hello there", seconds: 2 }], ["sentence", { index: 0, text: "Hi.", audio: { url: CLIP } }], ["done", {}]]), { headers: { "content-type": "text/event-stream" } });
  };
  const client = createOrazakaClient({ baseUrl: "https://edge.example.test", apiKey: "service-key-for-tests", consent: "1.0", region: "CA-QC", fetch: fake });
  const t = await client.turn({ conversationId: "c", audio: wav(), locale: "fr-CA", voice: "piper-fr-siwis-medium" });
  const form = seen.find((s) => s.url.endsWith("/voice/turns")).body;
  assert.ok(form.get("audio") instanceof Blob);
  assert.equal(form.get("text"), null);
  assert.equal(t.transcript, "hello there");
  assert.equal(t.sentences[0].audio.url, CLIP);
});

test("a clip is fetched without the service key: its signature is its credential", async () => {
  const seen = [];
  const fake = async (url, init) => {
    seen.push({ url: String(url), auth: init?.headers?.authorization });
    return new Response("RIFF", { headers: { "content-type": "audio/wav" } });
  };
  const client = createOrazakaClient({ baseUrl: "https://edge.example.test/", apiKey: "service-key-for-tests", consent: "1.0", region: "CA-QC", fetch: fake });
  await client.clip(CLIP);
  assert.deepEqual(seen, [{ url: `https://edge.example.test${CLIP}`, auth: undefined }]);
  await assert.rejects(() => client.clip("/api/v1/chat"), /INVALID_PAYLOAD/);
});

test("a spoken turn: heard as written by Orazaka, the answer with its voice through our own door", async () => {
  const stub = engine();
  useOrazakaClient(stub);
  const id = await open();
  const res = await speak(id, wav());
  assert.equal(res.status, 200);
  const { turn: t } = await res.json();
  assert.equal(t.heard, "Work was heavy this week");
  assert.equal(t.sentences[0].voice.clip, `/api/moment/clip?p=${encodeURIComponent(CLIP)}`);
  assert.ok(stub.calls[0].audio instanceof Blob);
  assert.equal(stub.calls[0].text, undefined);
  await json(turn, "/api/moment/turn", { momentId: id, text: "The kids too" });
  assert.match(stub.calls[1].context, /^Person: Work was heavy this week\nPresence: I hear you\.$/, "what was heard is the context of the next turn");
});

test("a typed turn has no `heard`: the person already sees their words", async () => {
  const id = await open();
  const { turn: t } = await (await json(turn, "/api/moment/turn", { momentId: id, text: "hello" })).json();
  assert.equal(t.heard, null);
});

test("silence: nothing is heard, nothing is answered, nothing is remembered", async () => {
  const stub = engine({ turn: async () => ({ transcript: "", sentences: [], crisis: null, declined: null }) });
  useOrazakaClient(stub);
  const id = await open();
  const { turn: t } = await (await speak(id, wav())).json();
  assert.equal(t.heard, "");
  assert.deepEqual(t.sentences, []);
  assert.deepEqual(moments.findMoment(id, ID(2)).recent, []);
});

test("a recording is bounded: size, type, and not empty", async () => {
  const id = await open();
  assert.equal((await speak(id, wav(MAX_AUDIO_BYTES + 1))).status, 413);
  assert.equal((await speak(id, wav(2000, "text/plain"))).status, 415);
  assert.equal((await speak(id, wav(0))).status, 400);
  assert.equal((await speak(id, null)).status, 400);
  assert.equal((await speak("not-a-moment", wav())).status, 400);
  assert.equal((await speak(id, wav(), as(3))).status, 404, "only the owner");
  assert.equal((await speak(id, wav(2000, "audio/ogg;codecs=opus"))).status, 200);
});

test("the pack's fixed crisis reply is spoken as the pack wrote it, and ends the moment", async () => {
  const text = "Je m'arrête là, parce que ce que vous venez d'écrire compte plus que l'exercice en cours. Des personnes formées écoutent :";
  const stub = engine({ turn: async () => ({ transcript: "I want to die", sentences: [], crisis: { text, resource: null, audio: { url: CLIP, durationMs: 9000 } }, declined: null }) });
  useOrazakaClient(stub);
  const id = await open();
  const { turn: t } = await (await speak(id, wav())).json();
  assert.equal(t.heard, "I want to die");
  assert.equal(t.crisis.text, text);
  assert.equal(t.crisis.voice.clip, `/api/moment/clip?p=${encodeURIComponent(CLIP)}`);
  assert.deepEqual(t.sentences, []);
  assert.equal(moments.findMoment(id, ID(2)), undefined);
});

test("the clip door: members only, edge addresses only, audio only, never stored", async () => {
  const stub = engine();
  useOrazakaClient(stub);
  const get = (p, cookie = as(2)) => clip.GET(new Request(`http://${HOST}/api/moment/clip?p=${encodeURIComponent(p)}`, { headers: { host: HOST, cookie } }));
  assert.equal((await get(CLIP, "")).status, 401);
  assert.equal((await get("/api/v1/chat")).status, 400);
  assert.equal((await get("https://evil.example/x")).status, 400);
  assert.deepEqual(stub.clips, [], "nothing was asked of the edge for a refused address");
  const ok = await get(CLIP);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "audio/wav");
  assert.equal(ok.headers.get("cache-control"), "no-store");
  assert.deepEqual(stub.clips, [CLIP]);
  useOrazakaClient(engine({ clip: async () => new Response("<html>", { headers: { "content-type": "text/html" } }) }));
  assert.equal((await get(CLIP)).status, 424, "what is not audio is not relayed");
  useOrazakaClient(engine({ clip: async () => new Response("gone", { status: 410 }) }));
  assert.equal((await get(CLIP)).status, 404);
  useOrazakaClient(null);
  assert.equal((await get(CLIP)).status, 424);
});

test("parseTurn still reads an audio turn's transcript before the sentences", () => {
  const t = parseTurn(sse([["transcript", { text: "bonjour", seconds: 1.5 }], ["sentence", { index: 0, text: "Bonjour.", audio: { url: CLIP, durationMs: 800 } }]]));
  assert.equal(t.transcript, "bonjour");
  assert.equal(t.sentences[0].audio.durationMs, 800);
});
