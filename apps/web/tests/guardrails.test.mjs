// Anti-dependence and cost control (#98): a short pause (8 minutes, 8 turns by default), 2 moments a day, 10 a week; at the turn limit the
// neighbour closes warmly (fixed text, no more model call). The counter holds numbers and dates, never text.
import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
for (const k of ["APP_MOMENT_MINUTES", "APP_MOMENTS_PER_DAY", "APP_MOMENTS_PER_WEEK", "APP_MOMENT_TURNS"]) delete process.env[k];

const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const { limits } = await import("../lib/moment-api.ts");
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
    return { transcript: null, sentences: [{ index: 0, text: "Ha, the elephant can fly.", audio: null }], crisis: null, declined: null };
  },
};
const HOST = "127.0.0.1:3400";
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n) => `yororis_auth=${issue(ID(n))}`;
const post = (handler, path, body, cookie = as(2)) =>
  handler.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));
const begin = async (cookie) => {
  const res = await post(start, "/api/moment/start", { presence: "lea", language: "fr", agreed: true }, cookie);
  return { res, json: await res.json() };
};

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  calls.length = 0;
  useOrazakaClient(engine);
});
test.after(() => useOrazakaClient(undefined));

test("the defaults are a short pause: 8 minutes, 8 turns, 2 a day, 10 a week", () => {
  assert.deepEqual(limits(), { minutes: 8, perDay: 2, perWeek: 10, turns: 8 });
});

test("at the turn limit the neighbour closes warmly: the last answer says so, the moment is gone, the model is not called again", async () => {
  process.env.APP_MOMENT_TURNS = "3";
  try {
    const { json } = await begin(as(2));
    const id = json.moment.id;
    const said = async (text) => (await post(turn, "/api/moment/turn", { momentId: id, text })).json();
    assert.equal((await said("un")).turn.closing, false);
    assert.equal((await said("deux")).turn.closing, false);
    const last = await said("trois");
    assert.equal(last.turn.closing, true, "the third and last turn closes");
    assert.equal(calls.length, 3);
    const after = await post(turn, "/api/moment/turn", { momentId: id, text: "quatre" });
    assert.equal(after.status, 404, "the moment is over and forgotten");
    assert.equal(calls.length, 3, "no model call after the limit");
    assert.equal(moments.findMoment(id, ID(2)), undefined);
  } finally {
    delete process.env.APP_MOMENT_TURNS;
  }
});

test("the daily quota: the third moment of the day is refused, with the time it opens again", async () => {
  assert.equal((await begin(as(2))).res.status, 201);
  const second = await begin(as(2));
  assert.equal(second.res.status, 409, "one moment at a time");
  moments.resetMoments();
  // Two moments taken today (the counter is kept per member, as dates only): the next is refused.
  moments.begin({ memberId: ID(2), presence: "lea", language: "fr" }, limits());
  moments.begin({ memberId: ID(2), presence: "lea", language: "fr" }, limits());
  for (const m of [...(globalThis.__yororisMoments?.live?.values() ?? [])]) moments.finish(m);
  const third = await begin(as(2));
  assert.equal(third.res.status, 429);
  assert.equal(third.json.code, "STOPS_DAY");
  assert.ok(new Date(third.json.nextAt).getTime() > Date.now());
});

test("the counter holds numbers and dates, never text", () => {
  const m = moments.begin({ memberId: ID(3), presence: "lea", language: "fr" }, limits());
  moments.remember(m, "something private", "an answer");
  moments.finish(m);
  assert.deepEqual(Object.keys(moments.takenBy(ID(3))[0]), ["startedAt"]);
  assert.ok(!JSON.stringify(globalThis.__yororisMoments?.taken ? [...globalThis.__yororisMoments.taken] : []).includes("something private"));
});

test("a moment past its end is over: it no longer blocks the next one", async () => {
  const first = await begin(as(4));
  assert.equal(first.res.status, 201);
  const m = moments.findMoment(first.json.moment.id, ID(4));
  m.endsAt = Date.now() - 1000; // its time ran out and nobody ended it
  assert.equal(moments.liveOf(ID(4)), undefined, "an expired moment is not live");
  moments.resetMoments();
  assert.equal((await begin(as(5))).res.status, 201);
});
