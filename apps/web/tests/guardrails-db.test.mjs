// The daily quota survives a restart (#98): the starts of the moments are kept as dates only, per account, in Postgres
// (TEST_DATABASE_URL; CI starts one). No text, no theme, no outcome: just when.
import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";
if (url) process.env.DATABASE_URL = `${url}?options=-c%20search_path%3Dt_guard`;
process.env.AUTH_SESSION_SECRET = "t".repeat(40);
delete process.env.AUTH_DEMO_PASSWORD;

const HOST = "127.0.0.1:3400";
const req = (path, method, body, cookie) =>
  new Request(`http://${HOST}${path}`, { method, headers: { host: HOST, origin: `http://${HOST}`, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
let db, moments, start, signIn, accounts, migrations, orazaka;

before(async () => {
  if (skip) return;
  db = await import("../lib/db.ts");
  migrations = await import("../lib/migrations.ts");
  accounts = await import("../lib/accounts.ts");
  moments = await import("../lib/moments.ts");
  orazaka = await import("../lib/orazaka.ts");
  start = await import("../app/api/moment/start/route.ts");
  signIn = await import("../app/api/auth/password/route.ts");
  await db.query("DROP SCHEMA IF EXISTS t_guard CASCADE; CREATE SCHEMA t_guard");
  await migrations.migrate();
  orazaka.useOrazakaClient({ installation: async () => "00000000-0000-4000-8000-0000000000aa", turn: async () => ({}) });
});
after(async () => {
  if (skip) return;
  orazaka.useOrazakaClient(undefined);
  await db.endPool();
});

test("two moments today, then a restart: the third is still refused; the table holds dates only", { skip }, async () => {
  const m = await accounts.provisionAccount({ email: "mira@example.test", name: "Mira", password: "a-long-test-passphrase-1" });
  await db.query("UPDATE accounts SET consented_at = now(), terms_version = '2026-10-21' WHERE id = $1", [m.id]);
  const login = await signIn.POST(req("/api/auth/password", "POST", { email: "mira@example.test", password: "a-long-test-passphrase-1" }));
  const cookie = `yororis_auth=${/yororis_auth=([^;]*)/.exec(login.headers.get("set-cookie"))?.[1]}`;
  const begin = () => start.POST(req("/api/moment/start", "POST", { presence: "lea", language: "fr", agreed: true }, cookie));
  for (let i = 0; i < 2; i++) {
    const res = await begin();
    assert.equal(res.status, 201, `moment ${i + 1}`);
    moments.finish(moments.findMoment((await res.json()).moment.id, m.id));
  }
  moments.resetMoments(); // a restart: the memory is gone, the dates are not
  const third = await begin();
  assert.equal(third.status, 429);
  assert.equal((await third.json()).code, "STOPS_DAY");
  const cols = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 't_guard' AND table_name = 'moment_starts' ORDER BY 1")).map((r) => r.column_name);
  assert.deepEqual(cols, ["account_id", "started_at"]);
});

test("deleting the account deletes its counter", { skip }, async () => {
  const [{ id }] = await db.query("SELECT id FROM accounts WHERE email = 'mira@example.test'");
  await db.query("DELETE FROM accounts WHERE id = $1", [id]);
  assert.equal((await db.query("SELECT 1 FROM moment_starts WHERE account_id = $1", [id])).length, 0);
});
