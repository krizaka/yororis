// The neighbour through the doors (#113, #114, #115): the band is asked with the consent, the neighbour is assigned, the chat is with that
// neighbour (its profile in the persona), moving is once a day. Runs on a real Postgres (TEST_DATABASE_URL; CI starts one).
import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";
if (url) process.env.DATABASE_URL = `${url}?options=-c%20search_path%3Dt_nb_api`;
process.env.AUTH_SESSION_SECRET = "t".repeat(40);
delete process.env.AUTH_DEMO_PASSWORD;

const HOST = "127.0.0.1:3400";
const req = (path, method, body, cookie) =>
  new Request(`http://${HOST}${path}`, { method, headers: { host: HOST, origin: `http://${HOST}`, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
let db, migrations, accounts, signIn, me, consent, neighbour, move, seen, start, turn, orazaka, n;
const calls = [];

before(async () => {
  if (skip) return;
  db = await import("../lib/db.ts");
  migrations = await import("../lib/migrations.ts");
  accounts = await import("../lib/accounts.ts");
  n = await import("../lib/neighbours.ts");
  orazaka = await import("../lib/orazaka.ts");
  signIn = await import("../app/api/auth/password/route.ts");
  me = await import("../app/api/me/route.ts");
  consent = await import("../app/api/me/consent/route.ts");
  neighbour = await import("../app/api/me/neighbour/route.ts");
  move = await import("../app/api/me/neighbour/move/route.ts");
  seen = await import("../app/api/me/neighbour/seen/route.ts");
  start = await import("../app/api/moment/start/route.ts");
  turn = await import("../app/api/moment/turn/route.ts");
  await db.query("DROP SCHEMA IF EXISTS t_nb_api CASCADE; CREATE SCHEMA t_nb_api");
  await migrations.migrate();
  orazaka.useOrazakaClient({
    installation: async () => "00000000-0000-4000-8000-0000000000aa",
    turn: async (input) => (calls.push(input), { transcript: null, sentences: [{ index: 0, text: "Ha.", audio: null }], crisis: null, declined: null }),
  });
});
after(async () => {
  if (skip) return;
  orazaka.useOrazakaClient(undefined);
  await db.endPool();
});

const member = async (email) => {
  await accounts.provisionAccount({ email, name: "Noor", password: "a-long-test-passphrase-1" });
  const res = await signIn.POST(req("/api/auth/password", "POST", { email, password: "a-long-test-passphrase-1" }));
  return `yororis_auth=${/yororis_auth=([^;]*)/.exec(res.headers.get("set-cookie"))?.[1]}`;
};

test("the consent asks the band too: no band, or a birth date, is refused; a band records the consent and assigns a neighbour of that band", { skip }, async () => {
  const cookie = await member("a@example.test");
  for (const body of [{ adult: true, terms: true }, { adult: true, terms: true, ageBand: "1990-04-12" }, { adult: true, terms: true, ageBand: "40-45" }, { adult: true, terms: true, ageBand: "25-34", birthDate: "1990-01-01" }]) {
    assert.equal((await consent.POST(req("/api/me/consent", "POST", body, cookie))).status, 400, JSON.stringify(body));
  }
  assert.equal((await me.GET(req("/api/me", "GET", null, cookie))).status, 200);
  assert.equal((await (await me.GET(req("/api/me", "GET", null, cookie))).json()).member.consented, false);
  assert.equal((await consent.POST(req("/api/me/consent", "POST", { adult: true, terms: true, ageBand: "25-34" }, cookie))).status, 200);
  assert.equal((await (await me.GET(req("/api/me", "GET", null, cookie))).json()).member.consented, true);
  const got = await (await neighbour.GET(req("/api/me/neighbour", "GET", null, cookie))).json();
  assert.ok(["Yoro", "Oris"].includes(got.neighbour.name), "a neighbour of the 25-34 band");
  assert.equal(got.moved, null);
  assert.deepEqual(Object.keys(got.neighbour).sort(), ["band", "id", "line", "name"], "only what the screen needs, no profile internals");
});

test("the chat is with the assigned neighbour: the client's choice is ignored, the profile travels with the persona", { skip }, async () => {
  const cookie = await member("b@example.test");
  await consent.POST(req("/api/me/consent", "POST", { adult: true, terms: true, ageBand: "65+" }, cookie));
  const res = await start.POST(req("/api/moment/start", "POST", { presence: "lea", language: "fr", agreed: true }, cookie));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.moment.neighbour.name, "Yoyo");
  const id = body.moment.id;
  await turn.POST(req("/api/moment/turn", "POST", { momentId: id, text: "Salut" }, cookie));
  const last = calls.at(-1);
  assert.match(last.context, /Tu t'appelles Yoyo\./);
  assert.match(last.context, /voyages et métiers d'autrefois/);
});

test("« aller voir un autre voisin »: another neighbour, once a day; the warm note is read once", { skip }, async () => {
  const cookie = await member("c@example.test");
  await consent.POST(req("/api/me/consent", "POST", { adult: true, terms: true, ageBand: "35-49" }, cookie));
  const first = (await (await neighbour.GET(req("/api/me/neighbour", "GET", null, cookie))).json()).neighbour;
  const went = await move.POST(req("/api/me/neighbour/move", "POST", {}, cookie));
  assert.equal(went.status, 200);
  const body = await went.json();
  assert.notEqual(body.neighbour.id, first.id);
  const again = await move.POST(req("/api/me/neighbour/move", "POST", {}, cookie));
  assert.equal(again.status, 429);
  const refused = await again.json();
  assert.equal(refused.code, "ONCE_A_DAY");
  assert.ok(new Date(refused.nextAt).getTime() > Date.now());
  const note = await (await neighbour.GET(req("/api/me/neighbour", "GET", null, cookie))).json();
  assert.equal(note.moved.from.id, first.id);
  assert.equal(note.moved.to.id, body.neighbour.id);
  assert.equal((await seen.POST(req("/api/me/neighbour/seen", "POST", {}, cookie))).status, 200);
  assert.equal((await (await neighbour.GET(req("/api/me/neighbour", "GET", null, cookie))).json()).moved, null);
  assert.ok(n.BANDS.length === 5);
});

test("the moment is closed until a neighbour is assigned", { skip }, async () => {
  const cookie = await member("d@example.test");
  await db.query("UPDATE accounts SET consented_at = now(), terms_version = '2026-10-21' WHERE email = 'd@example.test'");
  const res = await start.POST(req("/api/moment/start", "POST", { presence: "lea", language: "fr", agreed: true }, cookie));
  assert.equal(res.status, 403);
});
