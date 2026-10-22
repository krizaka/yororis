// The neighbour's persona (#99): a kind neighbour, an AI that says so, light and short; another angle when someone loops; « I don't know, but you'll
// find it » then a factual anecdote or a light joke; never advice, never the vocabulary of health or care. It travels with every turn as the
// caller's context (the Orazaka pack's own system prompt is changed in the engine's repository: see docs/FRAMEWORK.md).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
process.env.APP_MOMENT_TURNS = "20";

const messages = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fr: JSON.parse(readFileSync("messages/fr.json", "utf8")) };
const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const { useOrazakaClient } = await import("../lib/orazaka.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");

const FORBIDDEN = [/th[ée]rap/i, /\bpsy/i, /soigne|\bsoins?\b|\bcare\b|\bcure\b|gu[ée]ri/i, /\btreat/i, /traitement/i, /diagnos/i, /clinic/i, /m[ée]dica/i, /\bpatient/i, /s[ée]ance|\bsession/i, /coach/i, /health canada|sant[ée] canada|bien-?[êe]tre|wellbeing/i];

for (const l of ["en", "fr"]) {
  test(`${l}: the persona carries the three behaviours, stays short, and uses none of the forbidden vocabulary`, () => {
    const p = messages[l].console.persona.system;
    assert.ok(p.length > 200 && p.length <= 1500, `${p.length} characters: it shares the 8 000 of the turn's context`);
    for (const re of FORBIDDEN) assert.ok(!re.test(p), `${re} in the ${l} persona`);
    if (l === "fr") {
      assert.match(p, /voisin/i);
      assert.match(p, /Peut-être qu'il y a une autre piste/);
      assert.match(p, /Je ne sais pas, mais tu trouveras/);
      assert.match(p, /anecdote/i);
      assert.match(p, /vanne|humour/i);
      assert.match(p, /aucun conseil/i);
    } else {
      assert.match(p, /neighbour/i);
      assert.match(p, /Maybe there is another angle/);
      assert.match(p, /I don't know, but you'll find it/);
      assert.match(p, /anecdote/i);
      assert.match(p, /joke|humour/i);
      assert.match(p, /no advice/i);
    }
    assert.ok(!/—/.test(p), "no em dash");
  });
}

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

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  calls.length = 0;
  useOrazakaClient(engine);
});
test.after(() => useOrazakaClient(undefined));

test("every turn carries the persona in the language of the moment, then the last exchanges; the whole stays within the context budget", async () => {
  for (const language of ["fr", "en"]) {
    moments.resetMoments();
    const id = (await (await post(start, "/api/moment/start", { presence: "lea", language, agreed: true })).json()).moment.id;
    await post(turn, "/api/moment/turn", { momentId: id, text: "first thing" });
    await post(turn, "/api/moment/turn", { momentId: id, text: "second thing" });
    const [first, second] = calls.slice(-2);
    const persona = messages[language].console.persona.system;
    assert.ok(first.context.startsWith(persona), `${language}: the first turn already has the persona`);
    assert.ok(second.context.startsWith(persona));
    assert.ok(second.context.includes("first thing"), "then the last exchanges");
    assert.ok(second.context.length <= 8000, "within the 8 000 characters Orazaka accepts");
  }
});
