// Sign-up is closed: the cast is invited by construction (docs/FRAMEWORK.md). No route, no page, no link, no flag opens it.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const tracked = () => execSync("git ls-files --cached --others --exclude-standard app components lib", { encoding: "utf8" }).split("\n").filter(Boolean);

test("no route or page can create an account", () => {
  const paths = tracked().filter((f) => /sign-?up|regist|enrol|invit|join|create-account|new-account/i.test(f));
  assert.deepEqual(paths, []);
  const api = tracked().filter((f) => f.startsWith("app/api/"));
  assert.deepEqual(api.filter((f) => /auth\//.test(f)).sort(), ["app/api/auth/password/route.ts", "app/api/auth/sign-out/route.ts"]);
});

test("the store has no way to add a member: the cast is fixed", () => {
  const store = readFileSync("lib/store.ts", "utf8");
  assert.ok(!/export (const|function) (add|create|insert|register)\w*/i.test(store));
  assert.ok(!/members\.push|\.members = \[\.\.\./.test(store));
});

test("the sign-in page offers no way to ask for an account", () => {
  for (const l of ["en", "fr"]) {
    const words = JSON.stringify(JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).console.signIn);
    assert.ok(!/(create|new|open).{0,14}account|cr[ée]er.{0,14}compte|register|sign.?up|inscri/i.test(words), words);
  }
  const src = readFileSync("components/console/SignInForm.tsx", "utf8");
  assert.ok(!/href=/.test(src) || !/sign-?up|register/i.test(src));
});

test("no flag reopens it", () => {
  assert.ok(!/SIGNUP|SIGN_UP|REGISTRATION/.test(readFileSync("lib/env.ts", "utf8")));
});
