// The public site in the Cahier (krizaka-ui ADR-004, #417): the family's faces, and none of the tells of a generated
// template — no tracked capitals, no frosted backdrop, no pill on a label or a control, no rounded card.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const files = (dir) =>
  readdirSync(join(root, dir)).flatMap((n) => {
    const p = join(dir, n);
    return statSync(join(root, p)).isDirectory() ? files(p) : /\.(css|tsx?)$/.test(n) ? [p] : [];
  });
const sources = ["app", "components", "lib"].flatMap(files).map((p) => [p, readFileSync(join(root, p), "utf8")]);

test("the faces are Young Serif, Atkinson Hyperlegible Next and Courier Prime", () => {
  const fonts = readFileSync(join(root, "lib/fonts.ts"), "utf8");
  for (const face of ["atkinson-hyperlegible-next", "young-serif", "courier-prime"]) assert.match(fonts, new RegExp(face));
  assert.doesNotMatch(fonts, /inter-latin|plus-jakarta|jetbrains-mono/);
});

test("no tracked capitals, no frosted backdrop, no pill, no rounded card", () => {
  const offenders = [];
  for (const [p, s] of sources) {
    if (/text-transform:\s*uppercase|\buppercase\b(?=[^"]*")/.test(s)) offenders.push(`${p}: uppercase`);
    if (/backdrop-filter:\s*blur\([1-9]|backdrop-blur/.test(s)) offenders.push(`${p}: frosted backdrop`);
    if (/border-radius:\s*999px|rounded-full/.test(s)) offenders.push(`${p}: pill`);
    if (/border-radius:\s*(1[0-9]|[2-9][0-9])px/.test(s)) offenders.push(`${p}: rounded card`);
  }
  assert.deepEqual(offenders, []);
});
