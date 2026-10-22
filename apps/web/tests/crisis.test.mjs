// The crisis cut-off (#100): deterministic, BEFORE the model. A typed sentence that names a wish to die or to hurt oneself stops the moment
// at once and answers with a FIXED text (never generated) naming 9-8-8 and 811 Info-Social. The model is not called; nothing is stored,
// logged or counted from the input. Voice turns are off until a transcript can be screened first.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
process.env.APP_MOMENT_TURNS = "20";
delete process.env.APP_VOICE_TURNS;

const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const stats = await import("../lib/moment-stats.ts");
const { useOrazakaClient } = await import("../lib/orazaka.ts");
const { detectCrisis } = await import("../lib/crisis.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");
const messages = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fr: JSON.parse(readFileSync("messages/fr.json", "utf8")) };
const fixtures = JSON.parse(readFileSync(new URL("./crisis-fixtures.json", import.meta.url), "utf8"));

const POSITIVE = [
  ...fixtures.mustTrigger.map((f) => f.text),
  "je veux mourir", "J’ai envie de me tuer", "je vais me jeter en bas du pont", "je veux en finir avec la vie", "je songe au suicide",
  "j'ai des idées suicidaires", "je pense à me faire du mal", "je me scarifie depuis des mois", "plus envie de vivre", "tout le monde serait mieux sans moi",
  "I want to die", "i wanna kill myself", "I am thinking about suicide", "I'm going to end my life tonight", "I've been cutting myself", "I wish I were dead",
  "there is no reason to live", "i want to end it all", "I plan to hurt myself", "nobody would miss me, better off without me", "JE VEUX MOURIR",
  "j e   v e u x   m o u r i r".replace(/ {3}/g, "  "),
];
const NEGATIVE = [
  ...fixtures.mustNotTrigger.map((f) => f.text),
  "J'ai envie de mourir de rire", "On a tué le temps au café", "Je suis mort de fatigue ce soir", "I could die laughing at that video", "This exam is killing me",
  "I killed it at the presentation", "Le voisin m'a raconté l'histoire de l'éléphant qui vole", "Je veux en finir avec ce rapport avant vendredi", "I want to end this meeting early",
  "Tell me a fact about elephants", "Parle-moi de Montréal", "Mon chat est mort de vieillesse l'an dernier, je suis triste", "cut the cake, please",
];

test("every phrase that names a wish to die or to hurt oneself is caught, in French and English, whatever the case or the accents", () => {
  for (const text of POSITIVE) assert.equal(detectCrisis(text), true, text);
});

test("ordinary talk is not cut off: figures of speech, work, jokes, facts", () => {
  for (const text of NEGATIVE) assert.equal(detectCrisis(text), false, text);
});

test("the detector answers a boolean and nothing of the input", () => {
  assert.equal(typeof detectCrisis("je veux mourir"), "boolean");
  assert.equal(detectCrisis(""), false);
  assert.equal(detectCrisis("x".repeat(100_000)), false);
});

// The moment, with a stand-in for the model that records every call and its input.
const calls = [];
const engine = {
  async installation() {
    return "00000000-0000-4000-8000-0000000000aa";
  },
  async turn(input) {
    calls.push(input);
    return { transcript: null, sentences: [{ index: 0, text: "Ha.", audio: null }], crisis: null, declined: null };
  },
};
const HOST = "127.0.0.1:3400";
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n) => `yororis_auth=${issue(ID(n))}`;
const post = (handler, path, body, cookie = as(2)) =>
  handler.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));
const begin = async (n = 2) => (await (await post(start, "/api/moment/start", { presence: "lea", language: "fr", agreed: true }, as(n))).json()).moment.id;

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  stats.resetStats();
  calls.length = 0;
  useOrazakaClient(engine);
});
test.after(() => useOrazakaClient(undefined));

test("on a hit the model is never called: the answer is the fixed text naming 9-8-8 and 811 Info-Social, and the moment is over", async () => {
  const id = await begin();
  const res = await post(turn, "/api/moment/turn", { momentId: id, text: "je veux mourir" });
  assert.equal(res.status, 200);
  const { turn: t } = await res.json();
  assert.equal(calls.length, 0, "the model is not called");
  assert.equal(t.crisis.text, messages.fr.console.moment.crisisFixed, "the fixed text, as written in the messages");
  assert.match(t.crisis.text, /9-8-8/);
  assert.match(t.crisis.text, /811/);
  assert.match(t.crisis.text, /Info-Social/);
  assert.deepEqual(t.sentences, []);
  assert.equal(t.heard, null);
  assert.equal(moments.findMoment(id, ID(2)), undefined, "the moment is over and forgotten");
  assert.equal((await post(turn, "/api/moment/turn", { momentId: id, text: "bonjour" })).status, 404);
  assert.equal(calls.length, 0);
});

test("the English moment gets the English fixed text", async () => {
  const id = (await (await post(start, "/api/moment/start", { presence: "lea", language: "en", agreed: true })).json()).moment.id;
  const { turn: t } = await (await post(turn, "/api/moment/turn", { momentId: id, text: "I want to die" })).json();
  assert.equal(t.crisis.text, messages.en.console.moment.crisisFixed);
  assert.match(t.crisis.text, /9-8-8/);
  assert.match(t.crisis.text, /811/);
});

test("no trace of the input: not logged, not counted, not in the ledger, not in memory", async () => {
  const secret = "je veux mourir, vraiment, a-very-specific-marker-4f2a";
  const logged = [];
  const originals = {};
  for (const k of ["log", "info", "warn", "error", "debug"]) {
    originals[k] = console[k];
    console[k] = (...args) => logged.push(args.map(String).join(" "));
  }
  try {
    const id = await begin();
    await post(turn, "/api/moment/turn", { momentId: id, text: secret });
  } finally {
    for (const k of Object.keys(originals)) console[k] = originals[k];
  }
  assert.ok(!logged.join("\n").includes("a-very-specific-marker"), "nothing logged");
  assert.ok(!JSON.stringify(stats.listStats({ sort: "hour", dir: "desc", page: 1, size: 50 })).includes("a-very-specific-marker"));
  const row = stats.listStats({ sort: "hour", dir: "desc", page: 1, size: 5 }).rows[0];
  assert.equal(row.outcome, "lines");
  assert.equal(row.lines, true);
  const memory = JSON.stringify(globalThis.__yororisMoments ? { live: [...globalThis.__yororisMoments.live.values()], taken: [...globalThis.__yororisMoments.taken] } : {});
  assert.ok(!memory.includes("a-very-specific-marker"));
});

test("ordinary talk still reaches the model", async () => {
  const id = await begin();
  const res = await post(turn, "/api/moment/turn", { momentId: id, text: "Raconte-moi un fait sur les éléphants" });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
});

test("voice turns are off by default: a recording cannot be screened before the model, so it is refused", async () => {
  const id = await begin();
  const form = new FormData();
  form.set("momentId", id);
  form.set("audio", new Blob(["x"], { type: "audio/webm" }), "moment");
  const res = await turn.POST(new Request(`http://${HOST}/api/moment/turn`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie: as(2) }, body: form }));
  assert.equal(res.status, 415);
  assert.equal((await res.json()).code, "VOICE_OFF");
  assert.equal(calls.length, 0);
});

test("the fixed text exists in both languages and is the same wherever it is shown", () => {
  for (const l of ["en", "fr"]) {
    const t = messages[l].console.moment.crisisFixed;
    assert.match(t, /9-8-8/);
    assert.match(t, /811/);
  }
});
