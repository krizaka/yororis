// Sign-up is closed, server-side: the cast is invited by construction (docs/FRAMEWORK.md). The one door that bears the name answers 403
// to everything; no route, page, store function, message or flag can create an account.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { readEnv } = await import("../lib/env.ts");
const closedDoor = await import("../app/api/auth/sign-up/route.ts");
const store = await import("../lib/store.ts");

const tracked = () => execSync("git ls-files --cached --others --exclude-standard app components lib", { encoding: "utf8" }).split("\n").filter(Boolean);
const HOST = "127.0.0.1:3400";

test("the door that bears the name answers 403 to every method, whatever is sent", async () => {
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const res = await closedDoor[method](new Request(`http://${HOST}/api/auth/sign-up`, { method, headers: { host: HOST, origin: `http://${HOST}`, "content-type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify({ email: "new@example.test", password: "a-long-password-1" }) }));
    assert.equal(res.status, 403, method);
    assert.deepEqual(await res.json(), { success: false, code: "SIGNUP_CLOSED" });
  }
});

test("no other route or page can create an account", () => {
  const paths = tracked().filter((f) => /sign-?up|regist|enrol|invit|join|create-account|new-account/i.test(f));
  assert.deepEqual(paths, ["app/api/auth/sign-up/route.ts"]);
  const api = tracked().filter((f) => f.startsWith("app/api/auth/"));
  assert.deepEqual(api.sort(), ["app/api/auth/password/route.ts", "app/api/auth/sign-out/route.ts", "app/api/auth/sign-up/route.ts"]);
});

test("the store has no way to add a member: the cast is fixed", () => {
  const src = readFileSync("lib/store.ts", "utf8");
  assert.ok(!/export (const|function) (add|create|insert|register)\w*/i.test(src));
  assert.ok(!/members\.push|\.members = \[\.\.\./.test(src));
  assert.equal(typeof store.findByEmail("someone-new@example.test"), "undefined");
});

test("the sign-in page offers no way to ask for an account", () => {
  for (const l of ["en", "fr"]) {
    const words = JSON.stringify(JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).console.signIn);
    assert.ok(!/(create|new|open).{0,14}account|cr[ée]er.{0,14}compte|register|sign.?up|inscri/i.test(words), words);
  }
  const src = readFileSync("components/console/SignInForm.tsx", "utf8");
  assert.ok(!/href=/.test(src) || !/sign-?up|register/i.test(src));
});

test("the flag can only say it is closed: any other value refuses to start", () => {
  const ok = { AUTH_SESSION_SECRET: "x".repeat(32), AUTH_DEMO_PASSWORD: "a-demo-password" };
  assert.equal(readEnv(ok).AUTH_SIGNUP_ENABLED, "false", "closed by default");
  assert.equal(readEnv({ ...ok, AUTH_SIGNUP_ENABLED: "false" }).AUTH_SIGNUP_ENABLED, "false");
  for (const open of ["true", "1", "yes", "TRUE"]) assert.throws(() => readEnv({ ...ok, AUTH_SIGNUP_ENABLED: open }), /sign-up is closed/, open);
});
