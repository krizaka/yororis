// www.yororis.com is the public address; dev.yororis.com serves only its API, its /.well-known and its robots.txt (noindex) and sends
// every other page to www with a 308 (epic krizaka/.github#119, krizaka-com AGENTS §2.4). The apex and qa answer 308 with www.
// Read from the app spec (deploy/digitalocean/qa.app.yaml): one app serves the home and the member space.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const spec = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../deploy/digitalocean/qa.app.yaml"), "utf8").replace(/^\s*#.*$/gm, "");

test("www is the primary domain; the apex, dev and qa are aliases", () => {
  assert.match(spec, /- domain: www\.yororis\.com\n\s+type: PRIMARY/);
  assert.match(spec, /- domain: yororis\.com\n\s+type: ALIAS/);
  assert.match(spec, /- domain: dev\.yororis\.com\n\s+type: ALIAS/);
  assert.match(spec, /- domain: qa\.yororis\.com\n\s+type: ALIAS/);
});

test("ingress, in this order: the apex and qa redirect; dev keeps its API, /.well-known and robots.txt then redirects everything else; www serves the app", () => {
  const rules = spec.slice(spec.indexOf("ingress:")).split(/\n\s+- match:/).slice(1);
  assert.equal(rules.length, 7);
  assert.match(rules[0], /exact: yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.match(rules[1], /exact: qa\.yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.match(rules[2], /exact: dev\.yororis\.com[\s\S]*prefix: \/api[\s\S]*name: web/);
  assert.match(rules[3], /exact: dev\.yororis\.com[\s\S]*prefix: \/\.well-known[\s\S]*name: web/);
  assert.match(rules[4], /exact: dev\.yororis\.com[\s\S]*prefix: \/robots\.txt[\s\S]*name: web/);
  for (const i of [2, 3, 4]) assert.match(rules[i], /preserve_path_prefix: true/, `rule ${i}: the platform strips the matched prefix unless it is preserved`);
  assert.match(rules[5], /exact: dev\.yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.doesNotMatch(rules[5], /prefix/);
  assert.match(rules[6], /prefix: \/[\s\S]*name: web/);
});
