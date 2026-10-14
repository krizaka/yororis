import assert from "node:assert/strict";
import test from "node:test";

import { assertStartable, readEnv } from "../lib/env.ts";

const ok = { AUTH_SESSION_SECRET: "x".repeat(32), AUTH_DEMO_PASSWORD: "a-demo-password" };

test("the secrets are required, never defaulted", () => {
  assert.throws(() => readEnv({}), /AUTH_SESSION_SECRET/);
  assert.throws(() => readEnv({ ...ok, AUTH_SESSION_SECRET: "short" }), /at least 32/);
  assert.throws(() => readEnv({ ...ok, AUTH_DEMO_PASSWORD: "short" }), /at least 12/);
  assert.equal(readEnv(ok).AUTH_DEMO_PASSWORD, "a-demo-password");
});

test("construction mode: a production start is refused without a written release decision", () => {
  assert.throws(() => assertStartable({ ...ok, NODE_ENV: "production" }), /APP_RELEASE_APPROVAL/);
  assert.throws(() => assertStartable({ ...ok, NODE_ENV: "production", APP_RELEASE_APPROVAL: "  " }), /APP_RELEASE_APPROVAL/);
  assert.doesNotThrow(() => assertStartable({ ...ok, NODE_ENV: "production", APP_RELEASE_APPROVAL: "decision-2099-01-01" }));
  assert.doesNotThrow(() => assertStartable({ ...ok, NODE_ENV: "development" }));
});
