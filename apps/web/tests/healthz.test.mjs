// The health route of the dev checklist: public, no data, the version that runs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const healthz = await import("../app/api/healthz/route.ts");
const { appVersion } = await import("../lib/version.ts");

test("it answers 200 with the status and the version, to anyone, and says not to cache", async () => {
  process.env.APP_VERSION = "0.0.1+abc1234";
  const res = await healthz.GET();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", version: "0.0.1+abc1234" });
  assert.equal(res.headers.get("cache-control"), "no-store");
  delete process.env.APP_VERSION;
});

test("a local run says so, and nothing else is in the answer", async () => {
  delete process.env.APP_VERSION;
  assert.equal(appVersion(), "0.0.0+local");
  assert.deepEqual(Object.keys(await (await healthz.GET()).json()).sort(), ["status", "version"]);
});

test("the route needs no sign-in: the proxy leaves /api alone and the handler reads no cookie", () => {
  assert.match(readFileSync("proxy.ts", "utf8"), /matcher[^\n]*\(\?!api/);
  assert.ok(!/cookie|requireMember|fromRequest/.test(readFileSync("app/api/healthz/route.ts", "utf8")));
});

test("the version is shown in the signed-in space", () => {
  assert.match(readFileSync("components/console/ConsoleShell.tsx", "utf8"), /data-testid="app-version"/);
  for (const l of ["en", "fr"]) assert.match(JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).console.shell.version, /\{version\}/);
});
