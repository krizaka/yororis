#!/usr/bin/env node
// Construction mode (krizaka/yororis docs/FRAMEWORK.md §5): checked on every push and pull request, before any code.
//   1. README.md opens with the banner, word for word.
//   2. docs/FRAMEWORK.md exists.
//   3. No workflow deploys or publishes anything: none names a deployment target, a deploy/ folder, a store
//      submission or a release artifact.
// Lifting construction mode is a written decision first, then a pull request that changes this file on purpose.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const BANNER =
  "Under construction — not deployed, not offered to anyone. We are studying the legal, ethical and clinical framework in parallel. No date.";
const FORBIDDEN = [/deploy\//i, /digitalocean/i, /\bdoctl\b/i, /vercel/i, /eas\s+submit/i, /eas\s+build/i, /upload-artifact/i, /action-gh-release/i, /gh\s+release/i, /npm\s+publish/i];

const root = process.cwd();
const failures = [];

const firstLine = (readFileSync(join(root, "README.md"), "utf8").split("\n")[0] ?? "").replace(/^>\s*/, "").replace(/\*\*/g, "").trim();
if (firstLine !== BANNER) failures.push(`README.md must open with the construction banner:\n  expected: ${BANNER}\n  found:    ${firstLine}`);

if (!existsSync(join(root, "docs/FRAMEWORK.md"))) failures.push("docs/FRAMEWORK.md is missing.");

const workflows = join(root, ".github/workflows");
for (const file of existsSync(workflows) ? readdirSync(workflows) : []) {
  const text = readFileSync(join(workflows, file), "utf8");
  for (const pattern of FORBIDDEN) if (pattern.test(text)) failures.push(`.github/workflows/${file} matches ${pattern}: no workflow deploys or publishes in construction mode.`);
}

if (failures.length) {
  console.error(`Construction mode check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Construction mode: banner in place, FRAMEWORK.md present, no deployment or publishing workflow.");
