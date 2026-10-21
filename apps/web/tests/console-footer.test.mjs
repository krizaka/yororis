// dev-preview ui.krizaka-ui (#53): the signed-in space carries ONE footer — @krizaka/ui's SiteFooter in product mode
// (the « A Krizaka product » publisher line, the environment, the version) — rendered once, in the console's frame.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("components/console/ConsoleShell.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

test("the console frame renders exactly one SiteFooter, in product mode, with the environment and the version", () => {
  assert.equal((shell.match(/<SiteFooter\b/g) ?? []).length, 1);
  assert.match(shell, /import \{ SiteFooter \} from "@krizaka\/ui\/site-footer"/);
  const tag = shell.match(/<SiteFooter\b[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(tag, /current="yororis"/);
  assert.match(tag, /family=\{false\}/);
  assert.match(tag, /variant="app"/);
  assert.match(tag, /env="dev"/);
  assert.match(tag, /version=\{version\}/);
});

test("no second footer element in the console's sources", () => {
  assert.ok(!/<footer\b/.test(shell));
});
