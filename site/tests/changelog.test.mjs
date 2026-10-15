import assert from "node:assert/strict";
import test from "node:test";

import { changelogFrom, fetchPulls, WINDOW_DAYS } from "../scripts/changelog.mjs";

const NOW = new Date("2026-10-15T12:00:00Z");
const day = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const pr = (over) => ({ number: 1, title: "feat(lib): something", merged_at: day(1), body: "private text", labels: [{ name: "x" }], user: { login: "a" }, ...over });

test("keeps the merged user-facing changes of the last seven days, newest first, titles only", () => {
  const entries = changelogFrom(
    [pr({ number: 1, title: "feat(page): the construction page", merged_at: day(1) }), pr({ number: 2, title: "fix(site): a link", merged_at: day(3) }), pr({ number: 3, title: "docs(readme): footer", merged_at: day(0.5) })],
    NOW,
  );
  assert.deepEqual(entries.map((e) => e.number), [3, 1, 2]);
  assert.deepEqual(Object.keys(entries[0]).sort(), ["mergedAt", "number", "title"]);
  assert.equal(entries[1].title, "the construction page");
});

test("drops open, unmerged and older pull requests, and anything outside the window", () => {
  const entries = changelogFrom([pr({ merged_at: null }), pr({ number: 9, merged_at: day(WINDOW_DAYS + 1) }), pr({ number: 10, merged_at: "not a date" })], NOW);
  assert.equal(entries.length, 0);
});

test("hides infrastructure scopes, untyped titles and anything that promises what we do not offer", () => {
  const entries = changelogFrom(
    [
      pr({ number: 1, title: "feat(dev): lock the dev site" }),
      pr({ number: 2, title: "chore(deps): bump" }),
      pr({ number: 3, title: "Update things" }),
      pr({ number: 4, title: "feat(page): early access waiting list" }),
      pr({ number: 5, title: "feat(page): the framework, read in the open" }),
    ],
    NOW,
  );
  assert.deepEqual(entries.map((e) => e.number), [5]);
});

test("a failed or unexpected answer from GitHub is an empty week, never a failed build", async () => {
  assert.deepEqual(await fetchPulls(async () => ({ ok: false, json: async () => [] })), []);
  assert.deepEqual(await fetchPulls(async () => { throw new Error("offline"); }), []);
  assert.deepEqual(await fetchPulls(async () => ({ ok: true, json: async () => ({ message: "rate limited" }) })), []);
  const pulls = await fetchPulls(async (url) => {
    assert.match(url, /repos\/krizaka\/yororis\/pulls\?state=closed/);
    return { ok: true, json: async () => [pr({})] };
  });
  assert.equal(pulls.length, 1);
});
