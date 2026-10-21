// Cahier (krizaka-ui ADR-004, #417): this app's own sources carry none of the template tells the family retired — no
// uppercase tracked label, no frosted backdrop, no pill on a control or a label (a dot or an avatar stays round), no card
// corner of 10 px or more in its stylesheets. The identity itself comes from @krizaka/ui ≥ 3.38 and @krizaka/fonts ≥ 0.3.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = join(import.meta.dirname, "..");
const SKIP = ["node_modules", ".next", "fixtures", "__tests__", "_fonts"];
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (SKIP.includes(name)) return [];
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx|css)$/.test(name) && !/\.(test|stories)\./.test(name) ? [path] : [];
  });
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const sources = ["app", "components"].flatMap((d) => files(join(ROOT, d))).map((f) => [f.slice(ROOT.length + 1), code(readFileSync(f, "utf8"))]);
const offenders = (re) => sources.filter(([, s]) => re.test(s)).map(([f]) => f);
const ROUND = /\b(?:h-([\d.]+) w-\1|size-[\w.[\]-]+|w-([\d.]+) h-\2|h-1\.5 w-1\.5)\b/;

test("no uppercase tracked label", () => {
  assert.deepEqual(offenders(/["'`\s]uppercase["'`\s]|text-transform:\s*uppercase|textTransform: "uppercase"/), []);
  assert.deepEqual(offenders(/tracking-(wider|widest)|letter-spacing:\s*0?\.(0[4-9]|[1-9])/), []);
});
test("no frosted backdrop", () => assert.deepEqual(offenders(/backdrop-blur|backdrop-filter|backdropFilter/), []));
test("no pill on a control or a label, no round card in the stylesheets", () => {
  const pills = sources.flatMap(([f, s]) => (s.match(/"[^"\n]*rounded-full[^"\n]*"/g) ?? []).filter((c) => !ROUND.test(c)).map((c) => `${f}: ${c}`));
  assert.deepEqual(pills, []);
  const corners = sources.filter(([f]) => f.endsWith(".css")).flatMap(([f, s]) => [...s.matchAll(/border-radius:\s*(\d+)px/g)].filter((m) => Number(m[1]) >= 10 && Number(m[1]) < 999).map((m) => `${f}: ${m[1]}px`));
  assert.deepEqual(corners, []);
});
