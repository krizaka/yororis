// Law 25 minimisation (#96): an invited tester consents on the first sign-in (18 or older, the terms), only then reaches the moment;
// deleting the account removes every row about them at once. Runs on a real Postgres (TEST_DATABASE_URL; CI starts one).
import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";
if (url) process.env.DATABASE_URL = `${url}?options=-c%20search_path%3Dt_consent`;
process.env.AUTH_SESSION_SECRET = "t".repeat(40);
delete process.env.AUTH_DEMO_PASSWORD;

const HOST = "127.0.0.1:3400";
const req = (path, method, body, cookie) =>
  new Request(`http://${HOST}${path}`, { method, headers: { host: HOST, origin: `http://${HOST}`, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
const PASS = "a-long-test-passphrase-1";
let db, accounts, signIn, me, consent, start, migrations, terms;

before(async () => {
  if (skip) return;
  db = await import("../lib/db.ts");
  migrations = await import("../lib/migrations.ts");
  accounts = await import("../lib/accounts.ts");
  terms = await import("../lib/terms.ts");
  signIn = await import("../app/api/auth/password/route.ts");
  me = await import("../app/api/me/route.ts");
  consent = await import("../app/api/me/consent/route.ts");
  start = await import("../app/api/moment/start/route.ts");
  await db.query("DROP SCHEMA IF EXISTS t_consent CASCADE; CREATE SCHEMA t_consent");
  await migrations.migrate();
});
after(async () => {
  if (!skip) await db.endPool();
});

const cookieFor = async (email) => {
  const res = await signIn.POST(req("/api/auth/password", "POST", { email, password: PASS }));
  return `yororis_auth=${/yororis_auth=([^;]*)/.exec(res.headers.get("set-cookie"))?.[1]}`;
};

test("a new account has not consented; the member says so", { skip }, async () => {
  const m = await accounts.provisionAccount({ email: "noor@example.test", name: "Noor", password: PASS });
  assert.equal(m.consented, false);
  const got = await me.GET(req("/api/me", "GET", null, await cookieFor("noor@example.test")));
  assert.equal((await got.json()).member.consented, false);
});

test("before consent the moment is closed; consent needs BOTH boxes; then it is recorded with the version, once", { skip }, async () => {
  const cookie = await cookieFor("noor@example.test");
  const refused = await start.POST(req("/api/moment/start", "POST", { presence: "x", language: "en" }, cookie));
  assert.equal(refused.status, 403);
  assert.equal((await refused.json()).code, "CONSENT_REQUIRED");
  for (const body of [{}, { adult: true }, { terms: true }, { adult: false, terms: true }, { adult: true, terms: "yes" }, { adult: true, terms: true }]) {
    assert.equal((await consent.POST(req("/api/me/consent", "POST", body, cookie))).status, 400, JSON.stringify(body));
  }
  assert.equal((await consent.POST(req("/api/me/consent", "POST", { adult: true, terms: true, ageBand: "25-34" }, cookie))).status, 200);
  const [row] = await db.query("SELECT consented_at, terms_version FROM accounts WHERE email = 'noor@example.test'");
  assert.ok(row.consented_at);
  assert.equal(row.terms_version, terms.TERMS_VERSION);
  const got = await me.GET(req("/api/me", "GET", null, cookie));
  assert.equal((await got.json()).member.consented, true);
  assert.notEqual((await start.POST(req("/api/moment/start", "POST", { presence: "x", language: "en" }, cookie))).status, 403);
});

test("the account holds only what is listed; no conversation, mood or summary column exists", { skip }, async () => {
  const cols = (await db.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 't_consent' ORDER BY 1, 2")).map((r) => `${r.table_name}.${r.column_name}`);
  assert.deepEqual(
    cols.filter((c) => c.startsWith("accounts.")),
    ["accounts.age_band", "accounts.avatar", "accounts.calm_motion", "accounts.consented_at", "accounts.created_at", "accounts.email", "accounts.id", "accounts.last_moved_at", "accounts.last_seen_at", "accounts.locale", "accounts.move_due_at", "accounts.moved_from", "accounts.name", "accounts.neighbour_id", "accounts.neighbour_since", "accounts.password_hash", "accounts.role", "accounts.status", "accounts.subtitles", "accounts.terms_version"],
  );
  assert.ok(!cols.some((c) => /mood|summary|transcript|message|utterance|keep/i.test(c)));
});

test("deleting the account removes every row about the person at once: account, sign-ins, reset links", { skip }, async () => {
  const cookie = await cookieFor("noor@example.test");
  const [{ id }] = await db.query("SELECT id FROM accounts WHERE email = 'noor@example.test'");
  await db.query("INSERT INTO password_resets (account_id, token_hash, expires_at) VALUES ($1, 'h', now() + interval '1 hour')", [id]);
  assert.equal((await me.DELETE(req("/api/me", "DELETE", null, cookie))).status, 200);
  for (const [table, col] of [["accounts", "id"], ["access_tokens", "account_id"], ["password_resets", "account_id"]]) {
    assert.equal((await db.query(`SELECT 1 FROM ${table} WHERE ${col} = $1`, [id])).length, 0, table);
  }
  assert.equal((await me.GET(req("/api/me", "GET", null, cookie))).status, 401);
});
