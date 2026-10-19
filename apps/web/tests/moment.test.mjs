// The Moment: the presence that stops, Orazaka's voice turn as the only answer, the pack's fixed crisis reply shown as sent.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const { allowance, endsAt, isOver, isNearlyOver } = await import("../lib/moment-policy.ts");
const { parseTurn, createOrazakaClient, useOrazakaClient, refusalOf } = await import("../lib/orazaka.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");
const finish = await import("../app/api/moment/end/route.ts");

const fixtures = JSON.parse(readFileSync(new URL("./crisis-fixtures.json", import.meta.url), "utf8"));
const fold = (v) => v.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
const CRISIS_TEXT = "Je m'arrête là, parce que ce que vous venez d'écrire compte plus que l'exercice en cours. Des personnes formées écoutent, gratuitement et tout de suite :";
const RESOURCE = { region: "CA-QC", label: "Ligne québécoise", contact: "1 866 APPELLE", availability: "En tout temps", sourceUrl: "https://www.quebec.ca/x", verifiedOn: "2026-10-11" };
const sse = (events) => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");

/** A stand-in for Orazaka's edge: the crisis guard answers the fixtures with the pack's fixed reply, otherwise two sentences. */
function engine() {
  const calls = [];
  return {
    calls,
    async installation() {
      return "00000000-0000-4000-8000-0000000000aa";
    },
    async turn(input) {
      calls.push(input);
      if (fixtures.mustTrigger.some((f) => fold(f.text) === fold(input.text))) {
        return { transcript: null, sentences: [], crisis: { text: CRISIS_TEXT, resource: RESOURCE, audio: null }, declined: null };
      }
      return { transcript: null, sentences: [{ index: 0, text: "I hear you.", audio: null }, { index: 1, text: "What weighs the most?", audio: null }], crisis: null, declined: null };
    },
  };
}

const HOST = "127.0.0.1:3400";
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n) => `yororis_auth=${issue(ID(n))}`;
const post = (handler, path, body, cookie = as(2)) =>
  handler.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));
const begin = async (cookie, extra = {}) => {
  const res = await post(start, "/api/moment/start", { presence: "lea", language: "en", agreed: true, ...extra }, cookie);
  return { res, json: await res.json() };
};

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  useOrazakaClient(engine());
});
test.after(() => useOrazakaClient(undefined));

test("the presence that stops: one a day, three a week, and when it opens again", () => {
  const limits = { minutes: 25, perDay: 1, perWeek: 3 };
  const t0 = Date.UTC(2026, 9, 1, 21, 15);
  assert.deepEqual(allowance([], t0, limits), { ok: true });
  assert.deepEqual(allowance([{ startedAt: t0 }], t0 + 3600_000, limits), { ok: false, reason: "DAY", nextAt: t0 + 24 * 3600_000 });
  assert.equal(allowance([{ startedAt: t0 }], t0 + 25 * 3600_000, limits).ok, true);
  const week = [0, 1, 2].map((d) => ({ startedAt: t0 + d * 25 * 3600_000 }));
  const blocked = allowance(week, t0 + 3 * 25 * 3600_000, limits);
  assert.deepEqual(blocked, { ok: false, reason: "WEEK", nextAt: t0 + 7 * 24 * 3600_000 });
});

test("a moment ends on time, and says so two minutes before", () => {
  const limits = { minutes: 25, perDay: 1, perWeek: 3 };
  assert.equal(endsAt(1000, limits), 1000 + 25 * 60_000);
  assert.equal(isOver(0, 25 * 60_000 - 1, limits), false);
  assert.equal(isOver(0, 25 * 60_000, limits), true);
  assert.equal(isNearlyOver(0, 22 * 60_000, limits), false);
  assert.equal(isNearlyOver(0, 23 * 60_000, limits), true);
  assert.equal(isNearlyOver(0, 26 * 60_000, limits), false);
});

test("the voice turn is read as Orazaka sends it: sentences in order, the fixed crisis reply, the pack's refusal", () => {
  const t = parseTurn(sse([["transcript", { text: "hello", seconds: 1 }], ["sentence", { index: 1, text: "b" }], ["sentence", { index: 0, text: "a" }], ["done", {}]]));
  assert.deepEqual(t.sentences.map((s) => s.text), ["a", "b"]);
  assert.equal(parseTurn(sse([["safety.crisis", { response: "r", resource: RESOURCE, text: CRISIS_TEXT }]])).crisis.text, CRISIS_TEXT);
  assert.equal(parseTurn(sse([["scope.refused", { refusal: "Pas de diagnostic." }]])).declined.text, "Pas de diagnostic.");
  assert.throws(() => parseTurn("event: sentence\ndata: {not json\n\n"), /AI_SHAPE/);
  assert.throws(() => parseTurn(sse([["error", { code: "x" }]])), /AI_UNAVAILABLE/);
  assert.equal(refusalOf(451).code, "CONSENT");
  assert.equal(refusalOf(503).status, 424);
  assert.equal(refusalOf(401).status, 424);
});

test("the client talks to the edge with the service key, installs the pack once with its consent, and sends the context", async () => {
  const seen = [];
  const fake = async (url, init) => {
    seen.push({ url: String(url), method: init.method ?? "GET", auth: init.headers.authorization, body: init.body });
    if (String(url).endsWith("/api/v1/studios/installations")) return Response.json([]);
    if (String(url).includes("/installations?")) return Response.json({ id: "inst-1" }, { status: 201 });
    return new Response(sse([["sentence", { index: 0, text: "Hello." }], ["done", {}]]), { headers: { "content-type": "text/event-stream" } });
  };
  const client = createOrazakaClient({ baseUrl: "https://ai.example.test/", apiKey: "service-key-for-tests", consent: "1.0", region: "CA-QC", fetch: fake });
  const t = await client.turn({ conversationId: "c", text: "hi", locale: "fr-CA", voice: "piper-fr-siwis-medium", context: "Person: a" });
  assert.equal(t.sentences[0].text, "Hello.");
  await client.turn({ conversationId: "c", text: "again", locale: "fr-CA" });
  assert.ok(seen.every((s) => s.auth === "Bearer service-key-for-tests"));
  const install = seen.filter((s) => s.method === "POST" && s.url.includes("/installations?"));
  assert.equal(install.length, 1, "the pack is installed once");
  assert.deepEqual(JSON.parse(install[0].body), { config: {}, consentVersion: "1.0", ageAttested: true, region: "CA-QC" });
  const form = seen.find((s) => s.url.endsWith("/api/v1/voice/turns")).body;
  assert.equal(form.get("installationId"), "inst-1");
  assert.equal(form.get("voice"), "piper-fr-siwis-medium");
  assert.equal(form.get("context"), "Person: a");
  assert.equal(form.get("text"), "hi");
});

test("nothing configured: the moment is not available, it never answers by itself", async () => {
  useOrazakaClient(null);
  const { res, json } = await begin(as(2));
  assert.equal(res.status, 424, "424, never 502/503/504: the platform replaces those with its own error page");
  assert.equal(json.code, "AI_UNAVAILABLE");
});

test("a moment needs what is kept to be agreed to, and a known presence", async () => {
  assert.equal((await begin(as(2), { agreed: false })).res.status, 400);
  assert.equal((await begin(as(2), { presence: "someone" })).res.status, 400);
  assert.equal((await post(start, "/api/moment/start", { presence: "lea", language: "en", agreed: true }, "")).status, 401);
});

test("a turn is answered by the pack, and the next one carries what was said", async () => {
  const stub = engine();
  useOrazakaClient(stub);
  const { json } = await begin(as(2));
  const id = json.moment.id;
  const first = await (await post(turn, "/api/moment/turn", { momentId: id, text: "Work was heavy this week" })).json();
  assert.deepEqual(first.turn.sentences.map((s) => s.text), ["I hear you.", "What weighs the most?"]);
  assert.equal(first.turn.crisis, null);
  await post(turn, "/api/moment/turn", { momentId: id, text: "The kids too" });
  assert.equal(stub.calls[0].context, "");
  assert.match(stub.calls[1].context, /^Person: Work was heavy this week\nPresence: I hear you\. What weighs the most\?$/);
  assert.equal(stub.calls[0].locale, "en");
  assert.equal(stub.calls[0].voice, "piper-en-low");
});

test("every risk fixture raises the pack's fixed reply, untouched, and the moment stops", async () => {
  for (const f of fixtures.mustTrigger) {
    moments.resetMoments();
    const { json } = await begin(as(2));
    const res = await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: f.text });
    const body = await res.json();
    assert.equal(res.status, 200, f.text);
    assert.equal(body.turn.crisis?.text, CRISIS_TEXT, `no crisis panel for: ${f.text}`);
    assert.deepEqual(body.turn.sentences, [], "the presence says nothing of its own over the reply");
    assert.equal(body.turn.crisis.resource.region, "CA-QC");
    const again = await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: "hello" });
    assert.equal(again.status, 404, "the moment is over after the reply");
  }
});

test("an ordinary turn does not raise the panel", async () => {
  for (const f of fixtures.mustNotTrigger) {
    moments.resetMoments();
    const { json } = await begin(as(2));
    const body = await (await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: f.text })).json();
    assert.equal(body.turn.crisis, null, f.text);
    assert.ok(body.turn.sentences.length > 0);
  }
});

test("the moment stops on time: a turn after the end is refused", async () => {
  const { json } = await begin(as(2));
  const m = moments.findMoment(json.moment.id, ID(2));
  m.startedAt -= 26 * 60_000;
  m.endsAt = m.startedAt + 25 * 60_000;
  const res = await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: "one more" });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "MOMENT_OVER");
});

test("the presence that stops: a second moment the same day waits, and says when", async () => {
  const first = await begin(as(2));
  await post(finish, "/api/moment/end", { momentId: first.json.moment.id });
  const second = await begin(as(2));
  assert.equal(second.res.status, 429);
  assert.equal(second.json.code, "STOPS_DAY");
  assert.ok(new Date(second.json.nextAt).getTime() > Date.now());
});

test("one moment at a time, one turn at a time, and only its owner", async () => {
  const { json } = await begin(as(2));
  assert.equal((await begin(as(2))).res.status, 409);
  assert.equal((await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: "hi" }, as(3))).status, 404);
  moments.findMoment(json.moment.id, ID(2)).busy = true;
  assert.equal((await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: "hi" })).status, 429);
});

test("ending a moment forgets it: nothing is kept", async () => {
  const { json } = await begin(as(2));
  await post(turn, "/api/moment/turn", { momentId: json.moment.id, text: "something private" });
  const m = moments.findMoment(json.moment.id, ID(2));
  const res = await post(finish, "/api/moment/end", { momentId: json.moment.id });
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.canKeep, false, "ended without asking to keep: forgotten at once");
  assert.deepEqual(m.recent, []);
  assert.equal(moments.findMoment(json.moment.id, ID(2)), undefined);
});

test("a write from another origin is refused", async () => {
  const res = await start.POST(new Request(`http://${HOST}/api/moment/start`, { method: "POST", headers: { host: HOST, origin: "https://evil.example", cookie: as(2), "content-type": "application/json" }, body: "{}" }));
  assert.equal(res.status, 403);
});

test("the crisis panel shows the pack's reply as sent, in whichever languages it carries: no language is forced on it", () => {
  const src = readFileSync(new URL("../components/console/MomentView.tsx", import.meta.url), "utf8");
  const panel = src.slice(src.indexOf('data-testid="crisis-panel"'), src.indexOf("crisis.resource ?"));
  assert.match(panel, /whitespace-pre-line/);
  assert.ok(!/lang="fr"/.test(panel), "the pack's reply is bilingual: it must not be marked French");
  assert.match(panel, /\{crisis\.text\}/);
});
