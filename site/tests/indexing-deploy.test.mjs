// www.yororis.com is indexed (krizaka-com AGENTS §2.4): the deployed build must not close the site.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const spec = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.do/app.yaml"), "utf8");

test("the dev app spec builds the static site with APP_SEARCH_INDEXING=on (robots allows, sitemap, no noindex)", () => {
  const lines = spec.split("\n");
  const i = lines.findIndex((l) => !l.trim().startsWith("#") && l.includes("APP_SEARCH_INDEXING"));
  assert.ok(i >= 0, "APP_SEARCH_INDEXING is declared");
  assert.match(lines.slice(i, i + 3).join("\n"), /value:\s*"on"/);
});
