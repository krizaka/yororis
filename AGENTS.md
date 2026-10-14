# Yororis — agent contract (minimal, until the foundations land)

This repository is **under construction** (see [docs/FRAMEWORK.md](docs/FRAMEWORK.md)). Until the foundations pull
request replaces this file with the full contract, the Yororis programme kept by the Krizaka maintainers
(`company/prompts-yororis.md` in the krizaka-com workspace — §2 decisions, §2.1 lexicon, §2.2 construction mode, §3
product, §4 architecture) is the source of truth. Its rules already apply:

1. **Lexicon.** Name what it does, never what it would heal: *a listening space*, *a presence*, *a moment*, *what I
   keep*, *the thread*, *my notebook*. The "never" words (care, clinical and relationship vocabulary) appear in no user
   text, doc, file, table, route or identifier — the only exception is docs/FRAMEWORK.md §2, which denies them.
2. **Construction mode.** No deployment workflow, no production app or variable, no public build, no store submission,
   no outside person. `node scripts/check-construction.mjs` (CI) must stay green.
   **The static-site exception (Oussama, 2026-10-14).** Exactly one deployment is allowed: `site/`, a static page at
   https://dev.yororis.com — plain HTML + CSS built by `site/build.mjs` (mark from the published `@krizaka/ui`, colours
   from `@krizaka/tokens`, dark and light through `prefers-color-scheme`), shipped as a free DigitalOcean App Platform
   static site (`.do/app.yaml`, app `yororis-dev`, project `yororis`). It carries the reviewed "under construction"
   and "What Yororis is not" texts (copied from krizaka.com `site.yororis.reviewed.*`, fingerprinted in
   `site/site.test.mjs`), one call to action ("Talk to us about Yororis" → krizaka.com/contact?topic=yororis), the
   footer "A Krizaka product" and the version. No app, no backend, no sign-up, no form, no script, no variable.
   `check-construction.mjs` refuses anything else in `.do/app.yaml` (service, worker, job, database, function, variable)
   or server code in `site/`; `npm test` in `site/` runs the lexicon on the page text.
3. **All AI goes through Orazaka** (the wellbeing pack); no other provider. The crisis response comes from Orazaka and is
   never generated or rephrased.
4. Conventional Commits, a branch and a pull request for every change (`main` is protected, squash only).
5. **Environment variables are named by bounded context** (krizaka/.github#46): `<CONTEXT>_<THING>` with CONTEXT one of
   `APP_` `DATABASE_` `AUTH_` `MEDIA_` `MAIL_` `PUSH_` `PAYMENTS_` `REALTIME_` `ABUSE_` `OBSERVABILITY_` `AI_` `OPERATOR_`
   — never the product (`YORORIS_…`) nor a vendor (`BUNNY_…`, `MAILGUN_…`): a vendor is a value (`MAIL_PROVIDER=mailgun`);
   `NEXT_PUBLIC_` / `EXPO_PUBLIC_` only where the framework requires it, then the context. One typed env module per app
   (zod), fail-closed in production, its table generated into the docs. `scripts/check-construction.mjs` refuses a
   product- or vendor-prefixed variable name.
6. **No test, not done.** Every feature and every fix ships with its tests (unit for logic, end-to-end for a route or a
   flow, a render test for a component); a fix starts with a failing test that reproduces the bug. CI runs them and
   must be green.
