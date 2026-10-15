#!/usr/bin/env node
// "What moved this week" for the construction page: the pull requests merged into krizaka/yororis in the last seven
// days, read at build time from the public GitHub API (no token) and written to lib/changelog.generated.json. Only the
// titles of user-facing changes (feat, fix, docs, refactor) leave the repository — never a body, a label or an author.
// The build never fails on the network: no answer means an empty week, and the page says so.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = "krizaka/yororis";
export const WINDOW_DAYS = 7;
const KINDS = new Set(["feat", "fix", "docs", "refactor"]);
// Infrastructure and dependency changes stay out of the page.
const HIDDEN_SCOPES = new Set(["dev", "deploy", "ci", "deps", "release"]);
// A title that would read as a promise we do not make (see the lexicon, prompts-yororis.md §2.1) never reaches the page.
const NEVER = /coming soon|beta|early access|waiting list|sign-?up|inscri|essai|trial|download|t[ée]l[ée]charg|launch|lancement/i;

/** The entries of the window: merged, user-facing, titles only, newest first. Pure: the tests call it with fixtures. */
export function changelogFrom(pulls, now = new Date(), days = WINDOW_DAYS) {
  const since = now.getTime() - days * 86_400_000;
  const entries = [];
  for (const pr of pulls) {
    if (!pr.merged_at) continue;
    const at = new Date(pr.merged_at).getTime();
    if (!Number.isFinite(at) || at < since || at > now.getTime()) continue;
    const match = /^(\w+)(?:\(([^)]*)\))?!?:\s*(.+)$/.exec(pr.title ?? "");
    if (!match) continue;
    const [, kind, scope = "", title] = match;
    if (!KINDS.has(kind) || HIDDEN_SCOPES.has(scope)) continue;
    if (NEVER.test(title)) continue;
    entries.push({ mergedAt: pr.merged_at, title: title.trim(), number: pr.number });
  }
  return entries.sort((a, b) => (a.mergedAt < b.mergedAt ? 1 : -1));
}

/** The closed pull requests of the repository, most recently updated first. An error is an empty list, never a throw. */
export async function fetchPulls(fetchImpl = fetch, repo = REPO) {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "yororis-site-build" },
    });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const now = new Date();
  const entries = changelogFrom(await fetchPulls(), now);
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "changelog.generated.json");
  fs.writeFileSync(out, `${JSON.stringify({ generatedAt: now.toISOString(), window: WINDOW_DAYS, entries }, null, 2)}\n`);
  console.log(`changelog: ${entries.length} entries in the last ${WINDOW_DAYS} days → lib/changelog.generated.json`);
}
