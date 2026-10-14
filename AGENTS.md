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
   **The static-site exception (Oussama, 2026-10-14).** Exactly one deployment is allowed: `site/`, the static site at
   https://dev.yororis.com — a Next.js **static export** (`output: "export"`, no server), built from the published
   `@krizaka/ui` blocks (bar, hero, sections, cards, footer; the animated mark), `@krizaka/tokens` (`.brand-yororis`) and
   `@krizaka/fonts`, dark and light (system, with a toggle), English at `/` and French at `/fr/`. Shipped as a free
   DigitalOcean App Platform static site (`.do/app.yaml`, app `yororis-dev`, project `yororis`, `output_dir: out`). It carries
   the idea, how it is built in the open, the reviewed "under construction" and "What Yororis is not" texts (copied from
   krizaka.com `site.yororis.reviewed.*`, fingerprinted in `site/tests/site.test.mjs`), the crisis lines (9-8-8, 811), one call
   to action ("Talk to us about Yororis" → krizaka.com/contact?topic=yororis), the footer "A Krizaka product", the version.
   No app, no backend, no sign-up, no form, no date, no variable (only the build's `APP_VERSION`). The only scripts are the
   design system's (theme, bar, motion). `check-construction.mjs` refuses anything else in `.do/app.yaml` (service, worker,
   job, database, function, variable) or server code in `site/` (route handler, middleware, server action, env file);
   `npm run build && npm test` in `site/` runs the lexicon and the page contract on the built HTML.
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

## Search engines & AI assistants (Krizaka family contract)

The contract is defined once, in krizaka-com `AGENTS.md` §2.4, and checked here by `scripts/check-seo-family.mjs` (a copy of
the same dependency-free file in every site's repository — keep the copies identical; its unit test sits beside it).

dev.yororis.com is **indexed**. Construction mode keeps it static: `llms.txt` is a file in `site/public/` (a route handler is forbidden), the JSON-LD (WebSite + SoftwareApplication, publisher = the Krizaka Organization) offers nothing — no `offers`, no download — and the lexicon applies to `llms.txt` too (`site/tests/site.test.mjs`).
