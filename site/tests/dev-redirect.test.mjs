// www.yororis.com is the public address; dev.yororis.com only keeps /.well-known and sends every other page to www with a
// 308 (epic krizaka/.github#119, krizaka-com AGENTS §2.4). The apex answers 308 with www. Read from the app spec.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const spec = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.do/app.yaml"), "utf8").replace(/^\s*#.*$/gm, "");

test("www is the primary domain; the apex and dev are aliases", () => {
  assert.match(spec, /- domain: www\.yororis\.com\n\s+type: PRIMARY/);
  assert.match(spec, /- domain: yororis\.com\n\s+type: ALIAS/);
  assert.match(spec, /- domain: dev\.yororis\.com\n\s+type: ALIAS/);
});

test("ingress: the apex redirects, dev keeps /.well-known then redirects everything else, www serves the site — in that order", () => {
  const rules = spec.slice(spec.indexOf("ingress:")).split(/\n\s+- match:/).slice(1);
  assert.equal(rules.length, 4);
  assert.match(rules[0], /exact: yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.match(rules[1], /exact: dev\.yororis\.com[\s\S]*prefix: \/\.well-known[\s\S]*component:\s*\n?\s*name: site/);
  assert.match(rules[2], /exact: dev\.yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.doesNotMatch(rules[2], /prefix/);
  assert.match(rules[3], /prefix: \/[\s\S]*name: site/);
});
