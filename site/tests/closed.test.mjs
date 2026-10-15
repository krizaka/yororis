// Runs on a site BUILT with APP_SEARCH_INDEXING=off (the dev deployment): `APP_SEARCH_INDEXING=off npm run build && npm run test:closed`.
// robots.txt shuts the door and names no sitemap, there is no sitemap, every page is noindex, the dev line is in the footer.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const messages = { en: JSON.parse(readFileSync(join(out, "..", "messages/en.json"), "utf8")), fr: JSON.parse(readFileSync(join(out, "..", "messages/fr.json"), "utf8")) };
assert.ok(existsSync(join(out, "index.html")), "site/out is missing: build with APP_SEARCH_INDEXING=off first");

test("robots.txt disallows everything and advertises no sitemap", () => {
  const robots = readFileSync(join(out, "robots.txt"), "utf8");
  assert.match(robots, /User-Agent:\s*\*\s*\nDisallow:\s*\/\s*(\n|$)/i);
  assert.doesNotMatch(robots, /sitemap/i);
  assert.doesNotMatch(robots, /^Allow:/im);
});

test("the sitemap lists no page", () => {
  const path = join(out, "sitemap.xml");
  if (existsSync(path)) assert.doesNotMatch(readFileSync(path, "utf8"), /<loc>/);
});

for (const [locale, file] of [["en", "index.html"], ["fr", "fr/index.html"]]) {
  test(`${locale}: noindex in the page and the calm dev line in the footer`, () => {
    const html = readFileSync(join(out, file), "utf8");
    const robots = parse(html).querySelectorAll("meta").find((m) => m.getAttribute("name") === "robots");
    assert.ok(robots, "no <meta name=robots>");
    assert.match(robots.getAttribute("content"), /noindex/);
    assert.match(robots.getAttribute("content"), /nofollow/);
    assert.ok(html.includes(messages[locale].footer.devNotice), "the dev line is missing from the footer");
  });
}
