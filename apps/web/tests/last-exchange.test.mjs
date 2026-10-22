// The last exchange (yororis#99): on the final turn the context says so, so the neighbour closes warmly and deterministically; before it, it does not.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
process.env.APP_MOMENT_TURNS = "3";

const messages = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fr: JSON.parse(readFileSync("messages/fr.json", "utf8")) };
const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const { useOrazakaClient } = await import("../lib/orazaka.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");

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
const as = `yororis_auth=${issue("00000000-0000-4000-8000-000000000002")}`;
const post = (handler, path, body) =>
  handler.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie: as, "content-type": "application/json" }, body: JSON.stringify(body) }));

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  calls.length = 0;
  useOrazakaClient(engine);
});
test.after(() => useOrazakaClient(undefined));

for (const language of ["fr", "en"]) {
  test(`${language}: only the last turn's context carries the last-exchange line`, async () => {
    const line = messages[language].console.persona.lastExchange;
    assert.ok(line && line.length > 20 && line.length <= 400);
    assert.ok(!/—/.test(line), "no em dash");
    const id = (await (await post(start, "/api/moment/start", { presence: "lea", language, agreed: true })).json()).moment.id;
    for (const said of ["one", "two", "three"]) await post(turn, "/api/moment/turn", { momentId: id, text: said });
    assert.equal(calls.length, 3);
    assert.ok(!calls[0].context.includes(line), "first turn");
    assert.ok(!calls[1].context.includes(line), "second turn");
    assert.ok(calls[2].context.includes(line), "the last turn says it is the last exchange");
    assert.ok(calls[2].context.startsWith(messages[language].console.persona.system), "the persona still leads");
  });
}
