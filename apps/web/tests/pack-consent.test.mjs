// The wellbeing pack asks for its consent statement by version (451 answers the current one): the app installs it with 2.1, found live on
// 2026-10-21 when 1.0 was refused. A change of the pack's version is a change of this default (or of AI_WELLBEING_CONSENT).
import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
delete process.env.AI_WELLBEING_CONSENT;

const { readEnv } = await import("../lib/env.ts");

test("the pack's consent version defaults to the one it asks for now", () => {
  assert.equal(readEnv().AI_WELLBEING_CONSENT, "2.1");
  process.env.AI_WELLBEING_CONSENT = "3.0";
  assert.equal(readEnv().AI_WELLBEING_CONSENT, "3.0");
  delete process.env.AI_WELLBEING_CONSENT;
});
