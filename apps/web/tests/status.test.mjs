// The platform that hosts the QA app (DigitalOcean App Platform) replaces an application's own 502, 503 and 504 with its generic error page:
// found on the first deployment, where « the moment is not available right now » came back as an unreadable 504. The app answers a failed
// dependency with 424 (lib/orazaka.ts, UPSTREAM_FAILED) and never with one of those three.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("no route and no module answers with 502, 503 or 504", () => {
  const files = execSync("git ls-files --cached --others --exclude-standard app lib components", { encoding: "utf8" }).split("\n").filter((f) => /\.(ts|tsx)$/.test(f));
  const offenders = files.filter((f) => /\b(?:fail|OrazakaError|NextResponse\.json|Response\.json)\([^)]*\b50[234]\b|status:\s*50[234]\b/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

test("a failed dependency is a 424", async () => {
  process.env.AUTH_SESSION_SECRET = "t".repeat(40);
  process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";
  const { UPSTREAM_FAILED } = await import("../lib/orazaka.ts");
  assert.equal(UPSTREAM_FAILED, 424);
});
