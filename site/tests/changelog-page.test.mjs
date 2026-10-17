// /changelog (EN/FR): the weeks of merged work on the Changelog template, a static feed, and the footer's version link.
// Runs on the BUILT site (`npm run build` first), like tests/site.test.mjs.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { showable } from "../scripts/changelog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const read = (f) => readFileSync(join(root, f), "utf8");
assert.ok(existsSync(join(out, "index.html")), "site/out is missing: run `npm run build` before `npm test`");
const page = { en: "changelog/index.html", fr: "fr/changelog/index.html" };

test("only user-facing, merged, promise-free pull requests are shown", () => {
  const pr = (title, merged_at = "2026-10-15T10:00:00Z") => ({ title, merged_at });
  assert.equal(showable(pr("feat(page): the construction page")), true);
  assert.equal(showable(pr("feat(page): a page", null)), false);
  assert.equal(showable(pr("chore(deps): bump")), false);
  assert.equal(showable(pr("feat(dev): lock the dev site")), false);
  assert.equal(showable(pr("feat(site): sign-up opens")), false);
  assert.equal(showable(pr("Update things")), false);
});

for (const l of ["en", "fr"]) {
  test(`${l}: /changelog is built, on the template, with the latest week and the version anchor`, () => {
    assert.ok(existsSync(join(out, page[l])), `${page[l]} was not built`);
    const html = readFileSync(join(out, page[l]), "utf8");
    assert.match(html, /<h1[^>]*>/);
    assert.match(html, /kz-tpl-log/);
    const { releases } = JSON.parse(read("lib/changelog-weeks.generated.json"));
    if (releases.length) assert.ok(html.includes(`id="yororis-${releases[0].version}"`), "the latest week is on the page");
    const anchors = [...readFileSync(join(out, l === "en" ? "index.html" : "fr/index.html"), "utf8").matchAll(/href="[^"]*\/changelog\/#([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
    assert.equal(anchors.length, 1, "the footer links /changelog/#<version> once");
    assert.ok(html.includes(`id="${anchors[0]}"`), "the footer's anchor exists on the page");
  });
}

test("the feed is a static RSS file and the sitemap lists the page in both languages", () => {
  assert.match(readFileSync(join(out, "changelog/feed.xml"), "utf8"), /<rss version="2\.0"/);
  const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes("/changelog/") && sitemap.includes("/fr/changelog/"));
});

test("the change keeps the static-export contract: no route handler", () => {
  assert.ok(!existsSync(join(root, "app/(en)/changelog/feed.xml")) && !existsSync(join(root, "app/(en)/changelog/route.ts")));
});
