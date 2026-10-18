// The end of the moment: what the person keeps (described by the pack's Studio, read and edited by them, stored nowhere) and the presence that
// stops (what is left, when the next one opens). The words wait in memory only for the person's choice.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const { remainingFor } = await import("../lib/moment-policy.ts");
const { createOrazakaClient, useOrazakaClient, readKept } = await import("../lib/orazaka.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");
const end = await import("../app/api/moment/end/route.ts");
const keep = await import("../app/api/moment/keep/route.ts");
const forget = await import("../app/api/moment/forget/route.ts");

const SUMMARY = { themes: ["tired evenings", "no time for myself"], whatHelped: "Naming what weighs most.", smallStep: "Ask for a quarter of an hour.", bringTo: ["Evenings with the kids"], locale: "en" };

function engine(over = {}) {
  const kept = [];
  return {
    kept,
    async installation() {
      return "inst";
    },
    async turn() {
      return { transcript: null, sentences: [{ index: 0, text: "I hear you.", audio: null }], crisis: null, declined: null };
    },
    async clip() {
      return new Response("x");
    },
    async keep(input) {
      kept.push(input);
      if (over.keep) return over.keep(input);
      return { themes: SUMMARY.themes, whatHelped: SUMMARY.whatHelped, smallStep: SUMMARY.smallStep, takeAlong: SUMMARY.bringTo };
    },
  };
}

const HOST = "127.0.0.1:3400";
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n) => `yororis_auth=${issue(ID(n))}`;
const post = (handler, path, body, cookie = as(2)) => handler.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));
const open = async (n = 2, language = "en") => (await (await post(start, "/api/moment/start", { presence: "lea", language, agreed: true }, as(n))).json()).moment.id;
const say = (id, text, n = 2) => post(turn, "/api/moment/turn", { momentId: id, text }, as(n));

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  process.env.APP_MOMENTS_PER_DAY = "2";
  process.env.APP_MOMENTS_PER_WEEK = "5";
  useOrazakaClient(engine());
});
test.after(() => {
  delete process.env.APP_MOMENTS_PER_DAY;
  delete process.env.APP_MOMENTS_PER_WEEK;
  useOrazakaClient(undefined);
});

test("what is left of the presence that stops, and when the next opens", () => {
  const limits = { minutes: 25, perDay: 1, perWeek: 3 };
  const t0 = Date.UTC(2026, 9, 1, 21, 15);
  assert.deepEqual(remainingFor([], t0, limits), { today: 1, week: 3, nextAt: null });
  assert.deepEqual(remainingFor([{ startedAt: t0 }], t0 + 3600_000, limits), { today: 0, week: 2, nextAt: t0 + 24 * 3600_000 });
  const spent = [0, 1, 2].map((d) => ({ startedAt: t0 + d * 25 * 3600_000 }));
  assert.deepEqual(remainingFor(spent, t0 + 3 * 25 * 3600_000, limits), { today: 0, week: 0, nextAt: t0 + 7 * 24 * 3600_000 });
});

test("closing with the wish to keep: the words wait, the screen is told what is left", async () => {
  const id = await open();
  await say(id, "Work was heavy this week");
  const res = await post(end, "/api/moment/end", { momentId: id, keep: true });
  const body = await res.json();
  assert.equal(body.canKeep, true);
  assert.equal(body.remaining.today, 1, "two a day, one taken");
  assert.equal(body.remaining.week, 4);
  assert.equal(body.remaining.nextAt, null);
  const m = moments.findMoment(id, ID(2));
  assert.equal(m.ended, true);
  assert.equal(m.log.length, 2);
  assert.equal((await say(id, "one more")).status, 404, "a closed moment takes no more turns");
});

test("nothing to describe, or not asked: the words are forgotten at once", async () => {
  const empty = await open();
  assert.equal((await (await post(end, "/api/moment/end", { momentId: empty, keep: true })).json()).canKeep, false);
  assert.equal(moments.findMoment(empty, ID(2)), undefined);
  moments.resetMoments();
  const id = await open();
  await say(id, "private words");
  const m = moments.findMoment(id, ID(2));
  const body = await (await post(end, "/api/moment/end", { momentId: id })).json();
  assert.equal(body.canKeep, false);
  assert.deepEqual(m.log, []);
  assert.equal(moments.findMoment(id, ID(2)), undefined);
});

test("keeping: the Studio gets the words in order, the person's own numbers, their language; the words are forgotten once it is written", async () => {
  const stub = engine();
  useOrazakaClient(stub);
  const id = await open(2, "fr");
  await say(id, "Une semaine lourde");
  await say(id, "Surtout les soirées");
  await post(end, "/api/moment/end", { momentId: id, keep: true });
  const res = await post(keep, "/api/moment/keep", { momentId: id, moodBefore: 2, moodAfter: 4 });
  assert.equal(res.status, 200);
  const { kept } = await res.json();
  assert.deepEqual(kept.takeAlong, SUMMARY.bringTo);
  assert.equal(stub.kept[0].locale, "fr-CA");
  assert.equal(stub.kept[0].moodBefore, 2);
  assert.equal(stub.kept[0].moodAfter, 4);
  assert.equal(stub.kept[0].turns, "Person: Une semaine lourde\nPresence: I hear you.\nPerson: Surtout les soirées\nPresence: I hear you.");
  assert.equal(moments.findMoment(id, ID(2)), undefined, "forgotten once written");
});

test("a number is the person's own, 1 to 5, or nothing", async () => {
  const id = await open();
  await say(id, "hello");
  await post(end, "/api/moment/end", { momentId: id, keep: true });
  for (const bad of [0, 6, 2.5, "3"]) assert.equal((await post(keep, "/api/moment/keep", { momentId: id, moodAfter: bad })).status, 400, String(bad));
});

test("keeping needs a closed moment of one's own with something in it", async () => {
  const id = await open();
  await say(id, "hello");
  assert.equal((await post(keep, "/api/moment/keep", { momentId: id })).status, 404, "still open");
  await post(end, "/api/moment/end", { momentId: id, keep: true });
  assert.equal((await post(keep, "/api/moment/keep", { momentId: id }, as(3))).status, 404, "someone else's");
  assert.equal((await post(forget, "/api/moment/forget", { momentId: id }, as(3))).status, 200);
  assert.ok(moments.findMoment(id, ID(2)), "someone else cannot make it forget");
});

test("a failed Studio keeps nothing and loses nothing: the person can try again or let go", async () => {
  let fail = true;
  useOrazakaClient(engine({ keep: async () => { if (fail) throw Object.assign(new (await import("../lib/orazaka.ts")).OrazakaError(424, "AI_UNAVAILABLE")); return { themes: [], whatHelped: "", smallStep: "", takeAlong: [] }; } }));
  const id = await open();
  await say(id, "hello");
  await post(end, "/api/moment/end", { momentId: id, keep: true });
  const res = await post(keep, "/api/moment/keep", { momentId: id });
  assert.equal(res.status, 424);
  assert.equal((await res.json()).code, "AI_UNAVAILABLE");
  assert.ok(moments.findMoment(id, ID(2)), "the words still wait");
  fail = false;
  assert.equal((await post(keep, "/api/moment/keep", { momentId: id })).status, 200);
});

test("letting go forgets at once", async () => {
  const id = await open();
  await say(id, "hello");
  await post(end, "/api/moment/end", { momentId: id, keep: true });
  const m = moments.findMoment(id, ID(2));
  assert.equal((await post(forget, "/api/moment/forget", { momentId: id })).status, 200);
  assert.deepEqual(m.log, []);
  assert.equal(moments.findMoment(id, ID(2)), undefined);
});

test("nobody comes back: the words are forgotten after the minutes of the choice", async () => {
  const id = await open();
  await say(id, "hello");
  await post(end, "/api/moment/end", { momentId: id, keep: true });
  const m = moments.findMoment(id, ID(2));
  assert.equal(moments.sweep(Date.now() + moments.CLOSING_MS - 1000), 0);
  assert.equal(moments.sweep(Date.now() + moments.CLOSING_MS + 1000), 1);
  assert.deepEqual(m.log, []);
});

test("the pack's fixed crisis reply forgets the words at once: nothing to keep after it", async () => {
  useOrazakaClient({ ...engine(), async turn() { return { transcript: null, sentences: [], crisis: { text: "x", resource: null, audio: null }, declined: null }; } });
  const id = await open();
  await say(id, "I want to die");
  assert.equal(moments.findMoment(id, ID(2)), undefined);
});

test("the Studio client: finds the pack's -summary installation, runs it, waits for it, reads the lines", async () => {
  const seen = [];
  let polls = 0;
  const fake = async (url, init = {}) => {
    seen.push(`${init.method ?? "GET"} ${String(url).replace("https://edge.test", "")}`);
    if (String(url).endsWith("/studios/installations")) return Response.json([{ id: "i-1", studioKey: "guided-journaling" }, { id: "i-2", studioKey: "a-summary" }]);
    if (String(url).endsWith("/installations/i-2/runs")) return Response.json({ id: "run-1", status: "RUNNING" }, { status: 202 });
    polls += 1;
    return Response.json(polls < 2 ? { id: "run-1", status: "RUNNING", outputs: [] } : { id: "run-1", status: "SUCCEEDED", outputs: [{ key: "summary", type: "JSON", value: JSON.stringify(SUMMARY) }] });
  };
  const client = createOrazakaClient({ baseUrl: "https://edge.test", apiKey: "service-key-for-tests", consent: "1.0", region: "CA-QC", fetch: fake, pollMs: 1 });
  const kept = await client.keep({ turns: "Person: hi", locale: "en", moodBefore: 3 });
  assert.deepEqual(kept, { themes: SUMMARY.themes, whatHelped: SUMMARY.whatHelped, smallStep: SUMMARY.smallStep, takeAlong: SUMMARY.bringTo });
  assert.deepEqual(seen.slice(0, 3), ["GET /api/v1/studios/installations", "POST /api/v1/studios/installations/i-2/runs", "GET /api/v1/studios/runs/run-1"]);
  const noStudio = createOrazakaClient({ baseUrl: "https://edge.test", apiKey: "service-key-for-tests", consent: "1.0", region: "CA-QC", fetch: async () => Response.json([]), pollMs: 1 });
  await assert.rejects(() => noStudio.keep({ turns: "x", locale: "en" }), /AI_UNAVAILABLE/);
  const failed = createOrazakaClient({ baseUrl: "https://edge.test", apiKey: "service-key-for-tests", consent: "1.0", region: "CA-QC", pollMs: 1, fetch: async (u) => (String(u).endsWith("installations") ? Response.json([{ id: "i", studioKey: "x-summary" }]) : String(u).endsWith("/runs") ? Response.json({ id: "r", status: "RUNNING" }) : Response.json({ id: "r", status: "FAILED", outputs: [] })) });
  await assert.rejects(() => failed.keep({ turns: "x", locale: "en" }), /AI_UNAVAILABLE/);
  assert.throws(() => readKept("{not json"));
  assert.throws(() => readKept(JSON.stringify({ themes: ["a", "b", "c", "d"], whatHelped: "", smallStep: "" })), "at most three themes");
});

test("nothing is written down: no file, no database, no storage in the app's code", () => {
  const files = execSync("git ls-files --cached --others --exclude-standard app lib components", { encoding: "utf8" }).split("\n").filter((f) => /\.(ts|tsx)$/.test(f));
  const offenders = files.filter((f) => /from "node:fs"|from "fs"|writeFile|localStorage|sessionStorage|indexedDB|from "pg"|from "postgres"|drizzle/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

test("the end screen says what is kept, in both languages, and the person's number is their own", () => {
  for (const l of ["en", "fr"]) {
    const m = JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).console.moment;
    for (const k of ["keepAskTitle", "keepYes", "keepNo", "keptTitle", "keptHelp", "laterTitle", "laterLeft", "moodBefore", "moodAfter", "download", "copy"]) assert.ok(m[k], `${l}.${k}`);
    assert.match(m.laterLeft, /\{today\}.*\{week\}/);
    assert.match(m.keptHelp, /./);
  }
  const src = readFileSync("components/console/MomentClosing.tsx", "utf8");
  assert.match(src, /never computed, never inferred/);
});
