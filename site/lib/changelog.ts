import type { Release } from "@krizaka/ui/changelog-page";

import weeks from "./changelog-weeks.generated.json";

/* The weeks of merged work, written at build by scripts/changelog.mjs (the public GitHub API, no token) — the same
   filters as the construction page's « what moved this week »: user-facing titles only, nothing that promises what we do
   not offer. The site is a static export: the page is drawn from this file at build, never from the network at run time. */
export const RELEASES = (weeks as { releases: Release[] }).releases;
export const PULLS_URL = "https://github.com/krizaka/yororis/pulls?q=is%3Apr+is%3Amerged";
