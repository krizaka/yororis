// The invited testers' accounts (docs/FRAMEWORK.md §5): provisioned by an operator, never by sign-up; signed in by e-mail and
// password; a stored, revocable token in the cookie; profile and avatar; deletion. Runs on a real Postgres (TEST_DATABASE_URL —
// CI starts one; locally: docker run -e POSTGRES_PASSWORD=test -e POSTGRES_DB=yororis_test -p 54329:5432 postgres:16-alpine).
import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";
// Each test file has its own schema: the files run in parallel on one database.
if (url) process.env.DATABASE_URL = `${url}?options=-c%20search_path%3Dt_accounts`;
process.env.AUTH_SESSION_SECRET = "t".repeat(40);
delete process.env.AUTH_DEMO_PASSWORD;

const HOST = "127.0.0.1:3400";
const req = (path, method, body, cookie) =>
  new Request(`http://${HOST}${path}`, { method, headers: { host: HOST, origin: `http://${HOST}`, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
const cookieOf = (res) => /yororis_auth=([^;]*)/.exec(res.headers.get("set-cookie") ?? "")?.[1];

let db, accounts, signIn, signOut, me, migrations;
before(async () => {
  if (skip) return;
  db = await import("../lib/db.ts");
  migrations = await import("../lib/migrations.ts");
  accounts = await import("../lib/accounts.ts");
  signIn = await import("../app/api/auth/password/route.ts");
  signOut = await import("../app/api/auth/sign-out/route.ts");
  me = await import("../app/api/me/route.ts");
  await db.query("DROP SCHEMA IF EXISTS t_accounts CASCADE; CREATE SCHEMA t_accounts");
});
after(async () => {
  if (!skip) await db.endPool();
});

test("migrations apply once, in order, and are idempotent", { skip }, async () => {
  assert.deepEqual(await migrations.migrate(), [1, 2, 3]);
  assert.deepEqual(await migrations.migrate(), []);
});

test("provisioning stores a hash, never the password; a weak password or a taken address is refused", { skip }, async () => {
  const m = await accounts.provisionAccount({ email: "Mira@Example.test", name: "Mira", password: "a-long-test-password-1", locale: "fr" });
  assert.equal(m.email, "mira@example.test");
  assert.equal(m.organisation, "Invited testers");
  const [row] = await db.query("SELECT password_hash FROM accounts WHERE id = $1", [m.id]);
  assert.match(row.password_hash, /^scrypt\$/);
  assert.ok(!row.password_hash.includes("a-long-test-password-1"));
  await assert.rejects(accounts.provisionAccount({ email: "x@example.test", name: "X", password: "short" }), /TOO_SHORT/);
  await assert.rejects(accounts.provisionAccount({ email: "mira@example.test", name: "Mira 2", password: "a-long-test-password-1" }));
});

test("sign-in: the right password sets a stored token; the same 401 answers a wrong password and an unknown address", { skip }, async () => {
  const ok = await signIn.POST(req("/api/auth/password", "POST", { email: "mira@example.test", password: "a-long-test-password-1" }));
  assert.equal(ok.status, 200);
  const token = cookieOf(ok);
  assert.match(token, /^ya1\./);
  const [row] = await db.query("SELECT count(*)::int AS n FROM access_tokens");
  assert.equal(row.n, 1);
  const wrong = await signIn.POST(req("/api/auth/password", "POST", { email: "mira@example.test", password: "not-the-password-0" }));
  const unknown = await signIn.POST(req("/api/auth/password", "POST", { email: "nobody@example.test", password: "not-the-password-0" }));
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
});

test("the cookie opens the account; a forged cookie does not; sign-out ends it", { skip }, async () => {
  const ok = await signIn.POST(req("/api/auth/password", "POST", { email: "mira@example.test", password: "a-long-test-password-1" }));
  const cookie = `yororis_auth=${cookieOf(ok)}`;
  const got = await me.GET(req("/api/me", "GET", null, cookie));
  assert.equal(got.status, 200);
  assert.equal((await got.json()).member.email, "mira@example.test");
  assert.equal((await me.GET(req("/api/me", "GET", null, "yororis_auth=ya1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"))).status, 401);
  assert.equal((await signOut.POST(req("/api/auth/sign-out", "POST", null, cookie))).status, 200);
  assert.equal((await me.GET(req("/api/me", "GET", null, cookie))).status, 401);
});

test("profile: name, language, display choices and a default avatar; an unknown avatar is refused", { skip }, async () => {
  const ok = await signIn.POST(req("/api/auth/password", "POST", { email: "mira@example.test", password: "a-long-test-password-1" }));
  const cookie = `yororis_auth=${cookieOf(ok)}`;
  const patched = await me.PATCH(req("/api/me", "PATCH", { name: "Mira L.", locale: "en", calmMotion: true, avatar: "plain-4" }, cookie));
  assert.equal(patched.status, 200);
  const member = (await patched.json()).member;
  assert.deepEqual([member.name, member.locale, member.calmMotion, member.avatar], ["Mira L.", "en", true, "plain-4"]);
  assert.equal((await me.PATCH(req("/api/me", "PATCH", { avatar: "https://evil.example/x.png" }, cookie))).status, 400);
  assert.equal((await me.PATCH(req("/api/me", "PATCH", { avatar: null }, cookie))).status, 200);
});

test("a paused account is refused only once its password is right; deletion removes the account and its tokens", { skip }, async () => {
  const m = await accounts.provisionAccount({ email: "eric@example.test", name: "Eric", password: "another-long-password-2" });
  await db.query("UPDATE accounts SET status = 'PAUSED' WHERE id = $1", [m.id]);
  assert.equal((await signIn.POST(req("/api/auth/password", "POST", { email: "eric@example.test", password: "wrong-wrong-wrong-3" }))).status, 401);
  assert.equal((await signIn.POST(req("/api/auth/password", "POST", { email: "eric@example.test", password: "another-long-password-2" }))).status, 403);
  await db.query("UPDATE accounts SET status = 'ACTIVE' WHERE id = $1", [m.id]);
  const ok = await signIn.POST(req("/api/auth/password", "POST", { email: "eric@example.test", password: "another-long-password-2" }));
  const cookie = `yororis_auth=${cookieOf(ok)}`;
  assert.equal((await me.DELETE(req("/api/me", "DELETE", null, cookie))).status, 200);
  const [left] = await db.query("SELECT (SELECT count(*)::int FROM accounts WHERE id = $1) AS a, (SELECT count(*)::int FROM access_tokens WHERE account_id = $1) AS t", [m.id]);
  assert.deepEqual([left.a, left.t], [0, 0]);
});
