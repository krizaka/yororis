// The operator's script (scripts/provision-testers.mjs): accounts with generated passwords, written only to a private file
// (mode 600), never printed. Runs on a real Postgres (TEST_DATABASE_URL; CI starts one).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";

test("the script creates the account, keeps the secret out of its output, and does not overwrite an existing one", { skip }, async () => {
  const scoped = `${url}?options=-c%20search_path%3Dt_script`;
  process.env.DATABASE_URL = scoped;
  process.env.AUTH_SESSION_SECRET = "t".repeat(40);
  const admin = await import("../lib/db.ts");
  await admin.query("DROP SCHEMA IF EXISTS t_script CASCADE; CREATE SCHEMA t_script");
  const out = join(mkdtempSync(join(tmpdir(), "yo-")), "testers.md");
  const env = { ...process.env, DATABASE_URL: scoped, AUTH_SESSION_SECRET: "t".repeat(40) };
  const run = () => spawnSync("node", ["--import", "tsx", "scripts/provision-testers.mjs", "--out", out, "--url", "https://example.test", "Camille:camille-script@example.test:ADMIN:fr"], { encoding: "utf8", env });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /created: camille-script@example.test/);
  const file = readFileSync(out, "utf8");
  const given = /\| camille-script@example\.test \| (\S+) \| ADMIN \| https:\/\/example\.test \|/.exec(file)?.[1];
  assert.ok(given && given.length >= 20);
  assert.ok(!first.stdout.includes(given) && !first.stderr.includes(given));
  assert.equal(statSync(out).mode & 0o777, 0o600);
  const accounts = await import("../lib/accounts.ts");
  const db = await import("../lib/db.ts");
  const checked = await accounts.checkPassword("camille-script@example.test", given);
  assert.equal(checked.ok, true);
  assert.match(run().stdout, /exists: camille-script@example.test/);
  await db.endPool();
});
