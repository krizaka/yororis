// Forgotten password (e-mail link, one use, 30 minutes) and change of password (current one asked again, other sign-ins end).
// Mail goes through a stand-in for Mailgun: no network. Runs on a real Postgres (TEST_DATABASE_URL; CI starts one).
import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";
if (url) process.env.DATABASE_URL = `${url}?options=-c%20search_path%3Dt_flows`;
process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.APP_URL = "https://app.example.test";
process.env.MAIL_PROVIDER = "mailgun";
process.env.MAIL_API_KEY = "key-test";
process.env.MAIL_DOMAIN = "mg.example.test";
process.env.MAIL_API_URL = "http://mailgun.invalid"; // never reached: the stand-in answers, and a route call fails fast
delete process.env.AUTH_DEMO_PASSWORD;

const HOST = "127.0.0.1:3400";
const req = (path, method, body, cookie) =>
  new Request(`http://${HOST}${path}`, { method, headers: { host: HOST, origin: `http://${HOST}`, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
const cookieOf = (res) => `yororis_auth=${/yororis_auth=([^;]*)/.exec(res.headers.get("set-cookie") ?? "")?.[1]}`;

const OLD = "the-first-long-password-1";
let db, accounts, reset, signIn, forgot, resetRoute, change, me, migrations, limiter;
const mails = [];
const standIn = async (target, init) => {
  mails.push({ target: String(target), auth: init.headers.Authorization, form: Object.fromEntries(init.body) });
  return new Response("{}", { status: 200 });
};
const linkOf = (mail) => /https:\/\/app\.example\.test\/(en|fr)\/reset\?token=(yr1\.[A-Za-z0-9_-]{43})/.exec(mail.form.text);

before(async () => {
  if (skip) return;
  db = await import("../lib/db.ts");
  migrations = await import("../lib/migrations.ts");
  accounts = await import("../lib/accounts.ts");
  reset = await import("../lib/reset.ts");
  limiter = await import("../lib/rate-limit.ts");
  signIn = await import("../app/api/auth/password/route.ts");
  forgot = await import("../app/api/auth/forgot/route.ts");
  resetRoute = await import("../app/api/auth/reset/route.ts");
  change = await import("../app/api/auth/change/route.ts");
  me = await import("../app/api/me/route.ts");
  await db.query("DROP SCHEMA IF EXISTS t_flows CASCADE; CREATE SCHEMA t_flows");
  await migrations.migrate();
  await accounts.provisionAccount({ email: "mira@example.test", name: "Mira", password: OLD, locale: "fr" });
});
after(async () => {
  if (!skip) await db.endPool();
});

const signInAs = async (email, pass) => signIn.POST(req("/api/auth/password", "POST", { email, password: pass }));

test("forgot: the answer is the same for an address with an account and one without; only the first gets an e-mail, in its language", { skip }, async () => {
  limiter.resetLimiter();
  const known = await forgot.POST(req("/api/auth/forgot", "POST", { email: "mira@example.test" }));
  const unknown = await forgot.POST(req("/api/auth/forgot", "POST", { email: "nobody@example.test" }));
  assert.equal(known.status, 200);
  assert.deepEqual(await known.json(), await unknown.json());
  // The route sent through the real fetch (no stand-in): not asserted here. The mail itself, through the stand-in:
  const outcome = await reset.requestReset("mira@example.test", standIn);
  assert.equal(outcome, "sent");
  assert.equal(await reset.requestReset("nobody@example.test", standIn), "no_account");
  assert.equal(mails.length, 1);
  assert.equal(mails[0].target, "http://mailgun.invalid/v3/mg.example.test/messages");
  assert.match(mails[0].auth, /^Basic /);
  assert.equal(mails[0].form.to, "mira@example.test");
  assert.match(mails[0].form.subject, /Yororis/);
  assert.match(mails[0].form.text, /30 minutes/);
  assert.equal(linkOf(mails[0])[1], "fr");
});

test("reset: the link sets the new password once; the old one stops working; a second use, a bad token and a weak password are refused", { skip }, async () => {
  const [, , token] = linkOf(mails[0]);
  const before = await signInAs("mira@example.test", OLD);
  const stale = cookieOf(before);
  assert.equal((await resetRoute.POST(req("/api/auth/reset", "POST", { token, password: "short" }))).status, 400);
  const weak = await resetRoute.POST(req("/api/auth/reset", "POST", { token, password: "short" }));
  assert.equal((await weak.json()).code, "PASSWORD_TOO_SHORT");
  const ok = await resetRoute.POST(req("/api/auth/reset", "POST", { token, password: "the-second-long-password-2" }));
  assert.equal(ok.status, 200);
  assert.equal((await signInAs("mira@example.test", OLD)).status, 401);
  assert.equal((await signInAs("mira@example.test", "the-second-long-password-2")).status, 200);
  assert.equal((await me.GET(req("/api/me", "GET", null, stale))).status, 401, "the sign-ins made before the reset end");
  const again = await resetRoute.POST(req("/api/auth/reset", "POST", { token, password: "the-third-long-password-3" }));
  assert.equal((await again.json()).code, "INVALID_TOKEN");
  const bad = await resetRoute.POST(req("/api/auth/reset", "POST", { token: "yr1.not-a-real-token", password: "the-third-long-password-3" }));
  assert.equal((await bad.json()).code, "INVALID_TOKEN");
});

test("reset: an expired link is refused; only a hash of the token is stored", { skip }, async () => {
  await reset.requestReset("mira@example.test", standIn);
  const [, , token] = linkOf(mails.at(-1));
  const rows = await db.query("SELECT token_hash FROM password_resets WHERE token_hash = $1", [reset.resetTokenHash(token)]);
  assert.equal(rows.length, 1);
  assert.equal((await db.query("SELECT 1 FROM password_resets WHERE token_hash = $1", [token])).length, 0);
  await db.query("UPDATE password_resets SET expires_at = now() - interval '1 minute' WHERE token_hash = $1", [reset.resetTokenHash(token)]);
  const late = await resetRoute.POST(req("/api/auth/reset", "POST", { token, password: "the-fourth-long-password-4" }));
  assert.equal((await late.json()).code, "INVALID_TOKEN");
});

test("change: the current password is asked again; the other sign-ins end and this one stays", { skip }, async () => {
  const here = cookieOf(await signInAs("mira@example.test", "the-second-long-password-2"));
  const elsewhere = cookieOf(await signInAs("mira@example.test", "the-second-long-password-2"));
  const wrong = await change.POST(req("/api/auth/change", "POST", { current: "not-the-current-one-0", password: "the-fifth-long-password-5" }, here));
  assert.equal((await wrong.json()).code, "WRONG_PASSWORD");
  const noCookie = await change.POST(req("/api/auth/change", "POST", { current: "x", password: "y" }));
  assert.equal(noCookie.status, 401);
  const ok = await change.POST(req("/api/auth/change", "POST", { current: "the-second-long-password-2", password: "the-fifth-long-password-5" }, here));
  assert.equal(ok.status, 200);
  assert.equal((await me.GET(req("/api/me", "GET", null, here))).status, 200);
  assert.equal((await me.GET(req("/api/me", "GET", null, elsewhere))).status, 401);
  assert.equal((await signInAs("mira@example.test", "the-fifth-long-password-5")).status, 200);
});

test("mail fails closed: without a provider nothing is sent and the route still answers the same", { skip }, async () => {
  const keep = process.env.MAIL_PROVIDER;
  process.env.MAIL_PROVIDER = "none";
  assert.equal(await reset.requestReset("mira@example.test", standIn), "not_configured");
  limiter.resetLimiter();
  assert.equal((await forgot.POST(req("/api/auth/forgot", "POST", { email: "mira@example.test" }))).status, 200);
  process.env.MAIL_PROVIDER = keep;
});

test("forgot is rate limited per address", { skip }, async () => {
  limiter.resetLimiter();
  process.env.MAIL_PROVIDER = "none";
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await forgot.POST(req("/api/auth/forgot", "POST", { email: "rate@example.test" }))).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
});
