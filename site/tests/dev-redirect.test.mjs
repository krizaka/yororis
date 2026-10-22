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

test("ingress: the apex and qa redirect to www, everything else (www and dev) reaches the app; no route is listed", () => {
  const rules = spec.slice(spec.indexOf("ingress:")).split(/\n\s+- match:/).slice(1);
  assert.equal(rules.length, 3);
  assert.match(rules[0], /exact: yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.match(rules[1], /exact: qa\.yororis\.com[\s\S]*redirect:[\s\S]*authority: www\.yororis\.com[\s\S]*redirect_code: 308/);
  assert.match(rules[2], /prefix: \/[\s\S]*name: web/);
  assert.doesNotMatch(spec, /dev\.yororis\.com\n\s+(path|redirect)|well-known|robots\.txt|prefix: \/api/);
});
