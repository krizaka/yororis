// www.yororis.com is indexed (krizaka-com AGENTS §2.4): the home built into the app's image must not close the site.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("the image builds the home with indexing on: no APP_SEARCH_INDEXING=off anywhere in the Dockerfile or the app spec", () => {
  for (const f of ["deploy/docker/Dockerfile", "deploy/digitalocean/qa.app.yaml"]) assert.doesNotMatch(readFileSync(join(root, f), "utf8"), /APP_SEARCH_INDEXING\s*[=:]\s*"?off/i, f);
  assert.match(readFileSync(join(root, "deploy/docker/Dockerfile"), "utf8"), /AS home[\s\S]*npm run build/);
});
