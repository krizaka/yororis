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
   No app, no backend, no sign-up, no form, no date, no variable (only the build's `APP_VERSION` and `APP_SEARCH_INDEXING`, which is `off` on dev: noindex, robots `Disallow: /`, no sitemap, the line « Development environment — access by invitation » in the footer; production flips it). The only scripts are the
   design system's (theme, bar, motion). `check-construction.mjs` refuses anything else in `.do/app.yaml` (service, worker,
   job, database, function, variable) or server code in `site/` (route handler, middleware, server action, env file);
   `npm run build && npm test` in `site/` runs the lexicon and the page contract on the built HTML.
   **The member-space exception (Oussama, 2026-10-14).** `apps/web` — the member space and the organisation's console — exists
   as an app that runs **locally, in CI, and as the one QA-only deployment on dev** (below): `npm run dev` / `start` listen on `127.0.0.1` (port 3400) with a **fictional cast**
   held in memory (no database, nothing written, nobody real; the demo password and the cookie secret come from the
   environment, never defaulted). Built only from our libraries (`@krizaka/ui` AuthLayout, AppShell, DashboardLayout,
   SettingsLayout, DetailLayout, DataTable in server mode, form; `@krizaka/query`; `@krizaka/i18n`; brand `yororis`). It carries
   a calm personal home (the presence that stops — the organisation's defaults —, your moments, what I keep, the thread, my
   notebook, the lines to call: each a designed empty state, because nothing is available), the account (profile, display
   choices, consent and export placeholders, deletion) and, for an organiser, the members (search, filter, pause or restore access;
   never what anyone says or keeps). A permanent strip says "In development, for the QA accounts only".
   **QA-only on dev (Oussama, 2026-10-17, via the coordinator; krizaka/yororis#23; the private register line `yororis-cadre-6-2026-10-17-qa-only-dev`).**
   The app is deployed **once**, as a QA environment at https://qa.yororis.com (DigitalOcean App Platform, app `yororis-qa`, project
   `yororis`, one `apps-s-1vcpu-0.5gb` service, no database: the cast lives in memory): sign-up is closed server-side
   (`AUTH_SIGNUP_ENABLED` can only be `false`; `/api/auth/sign-up` answers 403 to everything; `tests/sign-up-closed.test.mjs`), only the QA
   accounts and the fictional cast can sign in, the lexicon is enforced, and **no real person uses it until the lawyer review** (krizaka/.github#40).
   The public static site (dev.yororis.com) stays « under construction » for real people and never links the app. The guard
   (`scripts/check-construction.mjs`, tested by `scripts/check-construction.test.mjs`) now allows exactly: `deploy/docker/Dockerfile` and
   `deploy/digitalocean/qa.app.yaml` (one service, a closed sign-up, the release reference, secrets typed SECRET, no database, the smallest
   size, never the static site's host), `output: "standalone"` only when `APP_STANDALONE` is set (the image build), and still refuses any
   Dockerfile, spec or platform file under `apps/`, a workflow that deploys (CI only *builds* the image), a script of `apps/web` that does not
   bind 127.0.0.1, a package that is not private, and an env module that would start in production without `APP_RELEASE_APPROVAL`.
   `.do/app.yaml` still declares the one static site and must not reference `apps/`. No sign-up exists (the cast is invited by construction).
   The lexicon applies to every word and identifier of the app (`apps/web/tests/lexicon.test.mjs`: the messages, the paths and the
   code; "session" only in the sign-in code). dev.yororis.com shows it only as **screenshots** in "How we're building it in the
   open", labelled "in development, not available".
3. **All AI goes through Orazaka** (the wellbeing pack); no other provider. The crisis response comes from Orazaka and is
   never generated or rephrased.
   **The Moment (2026-10-17, decision: QA-only on dev).** `apps/web/moment` is the listening moment: the person's words go to the
   wellbeing pack's voice turn (`lib/orazaka.ts`, the only file that names the endpoint; `AI_API_URL` + `AI_API_KEY`, absent =
   « not available right now », never a canned answer), and what comes back is what is shown. The pack's fixed crisis reply is
   shown as sent and ends the moment; « Besoin d'aide maintenant ? » with the three lines is on the screen in every state
   (checked at 360 px by `npm run test:e2e`). The presence stops: 25 minutes, 1 a day, 3 a week, enforced on the server. Nothing
   of what is said is stored (`moments.ts` holds the last exchanges in memory while the moment lasts). Tests:
   `tests/moment.test.mjs`, `tests/no-direct-model.test.mjs`, `tests/sign-up-closed.test.mjs`. The text of the screen is not
   yet reviewed by a lawyer (krizaka/.github#40). `docs/UX_DECISIONS.md` says why.
   Voice: the person holds a button to talk (recording ≤ 30 s, WebM or Ogg/Opus, sent to `/api/moment/turn`, transcribed by Orazaka's
   Whisper) and the presence's sentences are played from `/api/moment/clip`, which relays only the edge's own signed clip
   addresses (`lib/orazaka.ts`, `tests/voice.test.mjs`); captions are always shown, the sound can be turned off.
   Face: `PresenceFace` — a generated, fictitious person of the shared library (`people/personas/ui`, on the CDN, never committed) with the
   permanent AI mark; it breathes, and while a sentence plays it follows the energy of the real signal (the pack's lip-sync source is
   `ENERGY`: the voice turn returns no word timings). Calm under `prefers-reduced-motion` and the member's `calmMotion`.
4. Conventional Commits, a branch and a pull request for every change (`main` is protected, squash only).
5. **Environment variables are named by bounded context** (krizaka/.github#46): `<CONTEXT>_<THING>` with CONTEXT one of
   `APP_` `DATABASE_` `AUTH_` `MEDIA_` `MAIL_` `PUSH_` `PAYMENTS_` `REALTIME_` `ABUSE_` `OBSERVABILITY_` `AI_` `OPERATOR_`
   — never the product (`YORORIS_…`) nor a vendor (`BUNNY_…`, `MAILGUN_…`): a vendor is a value (`MAIL_PROVIDER=mailgun`);
   `NEXT_PUBLIC_` / `EXPO_PUBLIC_` only where the framework requires it, then the context. One typed env module per app
   (zod), fail-closed in production, its table generated into the docs. `scripts/check-construction.mjs` refuses a
   product- or vendor-prefixed variable name.
6. **No mobile app in the QA Dev preview** (decision of 2026-10-17): the web app is phone-first (checked at 360 px by `npm run test:e2e`); a native app comes after
   the lawyer review, in this repository (`apps/mobile`), never as a separate `yororis-mobile`.
6. **No test, not done.** Every feature and every fix ships with its tests (unit for logic, end-to-end for a route or a
   flow, a render test for a component); a fix starts with a failing test that reproduces the bug. CI runs them and
   must be green.

## Search engines & AI assistants (Krizaka family contract)

The contract is defined once, in krizaka-com `AGENTS.md` §2.4, and checked here by `scripts/check-seo-family.mjs` (a copy of
the same dependency-free file in every site's repository — keep the copies identical; its unit test sits beside it).

dev.yororis.com is **indexed**. Construction mode keeps it static: `llms.txt` is a file in `site/public/` (a route handler is forbidden), the JSON-LD (WebSite + SoftwareApplication, publisher = the Krizaka Organization) offers nothing — no `offers`, no download — and the lexicon applies to `llms.txt` too (`site/tests/site.test.mjs`).
