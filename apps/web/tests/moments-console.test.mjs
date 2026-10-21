// The organisation's view of the moments: counts and durations, the lines to call shown, nothing about words — never a word, never a name; organisers only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
process.env.APP_MOMENTS_PER_DAY = "50";
process.env.APP_MOMENTS_PER_WEEK = "50";

const { issue } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const moments = await import("../lib/moments.ts");
const stats = await import("../lib/moment-stats.ts");
const { useOrazakaClient } = await import("../lib/orazaka.ts");
const start = await import("../app/api/moment/start/route.ts");
const turn = await import("../app/api/moment/turn/route.ts");
const end = await import("../app/api/moment/end/route.ts");
const admin = await import("../app/api/admin/moments/route.ts");

const SECRET_WORDS = "my-private-sentence-xyz";
function engine(crisis = false) {
  return {
    async installation() { return "i"; },
    async turn() { return crisis ? { transcript: null, sentences: [], crisis: { text: "fixed", resource: null, audio: null }, declined: null } : { transcript: null, sentences: [{ index: 0, text: "I hear you.", audio: null }], crisis: null, declined: null }; },
    async clip() { return new Response("x"); },
  };
}

const HOST = "127.0.0.1:3400";
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n) => `yororis_auth=${issue(ID(n))}`;
const post = (h, path, body, n = 3) => h.POST(new Request(`http://${HOST}${path}`, { method: "POST", headers: { host: HOST, origin: `http://${HOST}`, cookie: as(n), "content-type": "application/json" }, body: JSON.stringify(body) }));
const list = (n, qs = "") => admin.GET(new Request(`http://${HOST}/api/admin/moments${qs}`, { headers: { host: HOST, ...(n ? { cookie: as(n) } : {}) } }));
const open = async (n, language = "en", presence = "lea") => (await (await post(start, "/api/moment/start", { presence, language, agreed: true }, n)).json()).moment.id;

test.beforeEach(() => {
  store.resetStore();
  moments.resetMoments();
  stats.resetStats();
  useOrazakaClient(engine());
});
test.after(() => useOrazakaClient(undefined));

test("organisers only: a member is refused, a signed-out visitor too", async () => {
  assert.equal((await list(3)).status, 403);
  assert.equal((await list(null)).status, 401);
  assert.equal((await list(1)).status, 200, "the organiser (the first of the cast)");
});

test("a moment is one line: when to the hour, presence, language, length, turns, how it ended, lines shown, nothing about words — and no word, no name", async () => {
  const id = await open(3, "fr", "noor");
  await post(turn, "/api/moment/turn", { momentId: id, text: SECRET_WORDS }, 3);
  await post(end, "/api/moment/end", { momentId: id }, 3);
  const res = await list(1);
  const text = await res.text();
  assert.ok(!text.includes(SECRET_WORDS), "the words never reach the organisation");
  assert.ok(!text.includes(ID(3)) && !/demo\.yororis|Marie|Samir|Jordan|Camille|Noor \(demo\)/i.test(text), "nor who");
  const { rows, total } = JSON.parse(text);
  assert.equal(total, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["durationSec", "hour", "id", "language", "lines", "outcome", "presence", "turns"]);
  assert.equal(rows[0].presence, "noor");
  assert.equal(rows[0].language, "fr");
  assert.equal(rows[0].turns, 1);
  assert.equal(rows[0].outcome, "closed");
  assert.equal(rows[0].lines, false);
  assert.match(rows[0].hour, /T\d\d:00:00\.000Z$/, "to the hour, no more");
  assert.ok(rows[0].durationSec >= 0);
});

test("the pack's fixed reply is counted as « the lines to call were shown »", async () => {
  useOrazakaClient(engine(true));
  const id = await open(3);
  await post(turn, "/api/moment/turn", { momentId: id, text: "x" }, 3);
  const { rows, summary } = await (await list(1)).json();
  assert.equal(rows[0].outcome, "lines");
  assert.equal(rows[0].lines, true);
  assert.equal(summary.linesShown, 1);
});

test("a moment left open past its end stopped on its own; one ended is closed", async () => {
  const id = await open(3);
  await post(turn, "/api/moment/turn", { momentId: id, text: "hello" }, 3);
  const later = Date.now() + 26 * 60_000;
  const { rows } = stats.listStats({ sort: "hour", dir: "desc", page: 1, size: 10 }, later);
  assert.equal(rows[0].outcome, "over");
  assert.equal(rows[0].durationSec, 25 * 60);
  const id2 = await open(4);
  await post(turn, "/api/moment/turn", { momentId: id2, text: "hello" }, 4);
  await post(end, "/api/moment/end", { momentId: id2 }, 4);
  assert.equal(stats.listStats({ sort: "hour", dir: "desc", page: 1, size: 10 }).rows.find((r) => r.id !== rows[0].id).outcome, "closed");
});

test("the figures: moments, last 24 h, average length, lines shown", async () => {
  for (const n of [3, 4]) {
    const id = await open(n);
    await post(turn, "/api/moment/turn", { momentId: id, text: "a" }, n);
    await post(end, "/api/moment/end", { momentId: id }, n);
  }
  const { summary } = await (await list(1)).json();
  assert.equal(summary.moments, 2);
  assert.equal(summary.last24h, 2);
  assert.ok(!("keptShare" in summary));
  assert.equal(summary.linesShown, 0);
  assert.ok(summary.averageSeconds >= 0);
});

test("sorted, filtered by how it ended, and paged on the server", async () => {
  for (let i = 0; i < 3; i++) {
    moments.resetMoments();
    const id = await open(3);
    await post(turn, "/api/moment/turn", { momentId: id, text: "a" }, 3);
    if (i < 2) await post(end, "/api/moment/end", { momentId: id }, 3);
  }
  const closed = await (await list(1, "?outcome=closed")).json();
  assert.equal(closed.total, 2);
  assert.ok(closed.rows.every((r) => r.outcome === "closed"));
  const paged = await (await list(1, "?page=2&size=2&sort=turns&dir=asc")).json();
  assert.equal(paged.rows.length, 1);
  assert.equal((await list(1, "?sort=content")).status, 400);
  assert.equal((await list(1, "?size=500")).status, 400);
});

test("the page and the menu are the organiser's, in Krizaka UI's Stat grid and DataTable, and say that nothing is read", () => {
  const page = readFileSync("app/[locale]/(app)/(console)/admin/moments/page.tsx", "utf8");
  assert.match(page, /member\?\.role !== "ADMIN"\) notFound\(\)/);
  const ui = readFileSync("components/console/MomentsConsole.tsx", "utf8");
  assert.match(ui, /from "@krizaka\/ui\/stat"/);
  assert.match(ui, /from "@krizaka\/ui\/data-table"/);
  assert.ok(!/<table/.test(ui), "no hand-written table");
  const shell = readFileSync("components/console/ConsoleShell.tsx", "utf8");
  assert.match(shell, /organiser \?[\s\S]*admin\/moments/);
  for (const l of ["en", "fr"]) assert.match(JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).console.admin.moments.lead, /./);
});

test("the ledger has no field that could hold a word or a name", () => {
  const src = readFileSync("lib/moment-stats.ts", "utf8");
  const shape = src.slice(src.indexOf("export interface MomentStat"), src.indexOf("const holder"));
  assert.ok(!/(text|content|message|transcript|email|name|memberId|actor|user)\b/i.test(shape.replace(/\/\*[\s\S]*?\*\//g, "")), shape);
});
