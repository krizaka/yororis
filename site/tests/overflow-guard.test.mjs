// The responsive guard exists, covers the widths and both themes, holds the crisis lines to the first phone screen, and CI runs it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = readFileSync(join(root, "scripts/check-overflow.mjs"), "utf8");

test("the guard checks 360, 390, 430, 768, 1024 and 1440 px in both themes, and the crisis lines in the first 360 px screen", () => {
  assert.ok(script.includes("export const WIDTHS = [360, 390, 430, 768, 1024, 1440]"));
  assert.ok(script.includes('["dark", "light"]'));
  assert.ok(script.includes("tel:"));
  assert.ok(script.includes("height: 740"));
});

test("it is an npm script and a CI step on the built site", () => {
  assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts["check:overflow"], "node scripts/check-overflow.mjs");
  assert.ok(readFileSync(join(root, "../.github/workflows/ci.yml"), "utf8").includes("check:overflow"));
});

test("the crisis lines are tap targets on a phone, and the crane stands in a halo", () => {
  const css = readFileSync(join(root, "app/globals.css"), "utf8");
  assert.match(css, /\.yo-crisis-lines span \{[^}]*min-height: 56px/);
  assert.ok(css.includes(".yo-hero-crane::before"));
  assert.ok(readFileSync(join(root, "components/PresencePreview.tsx"), "utf8").includes("yo-hero-crane"));
});
