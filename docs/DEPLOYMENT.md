# Deployment — the QA app on dev

Yororis has **two** deployments, and only these two (checked by `scripts/check-construction.mjs`):

| What | Where | Built from | For whom |
| :--- | :--- | :--- | :--- |
| The static site (« under construction ») | https://dev.yororis.com — DigitalOcean App Platform app `yororis-dev`, a static site (free tier) | `site/`, spec `.do/app.yaml` | everyone; no app, no backend, no sign-up |
| **The QA app** (the member space and the Moment) | https://qa.yororis.com — app `yororis-qa`, project `yororis`, region `tor`, one service `apps-s-1vcpu-0.5gb` | `apps/web` through `deploy/docker/Dockerfile`, spec `deploy/digitalocean/qa.app.yaml` | **the QA accounts and a fictional cast only** — no real person until the lawyer review (krizaka/.github#40) |

Decision (Oussama, 2026-10-17, via the coordinator; krizaka/yororis#23): leave « construction » for a **QA-only Dev preview** — sign-up closed,
only the QA and persona accounts, the lexicon enforced, nobody real. The public site is unchanged and never links the app. The decision is
recorded in the private register (`yororis-cadre-6-2026-10-17-qa-only-dev`), which is what `APP_RELEASE_APPROVAL` carries.

## Cost

One service of the smallest size: **5 USD/month**, no database (the cast lives in memory and is rebuilt at every start), no volume, no worker.
Within the cloud budget of the addendum (≤ 100 USD/month, GPU apart).

## What runs, and how it is built

- `deploy/docker/Dockerfile`: `npm ci`, `next build` with `APP_STANDALONE=1`, then `node server.js` as a non-root user on port 8080. The build bakes
  **no secret** (two placeholders named `build-only…` stay in the build stage); the version `X.Y.Z+sha` is written at build and read at start.
- CI (job « Container image ») builds the image and starts it: `/api/healthz` answers 200 with the version, `/api/auth/sign-up` answers 403.
  CI never deploys. DigitalOcean builds and deploys `main` on every push (`deploy_on_push`).
- The app starts only with `APP_RELEASE_APPROVAL` (the reference above), `AUTH_SIGNUP_ENABLED` unset or `false`, and its two secrets.

## Environment

Names are `<CONTEXT>_<THING>` (krizaka/.github#46). Secrets are DigitalOcean `SECRET`s filled when the spec is applied; they live in
`~/Documents/krizaka/yororis.env` (mode 600) and are read with `secret.sh`, never printed.

| Variable | Scope | Value / source |
| :--- | :--- | :--- |
| `APP_COMMIT_SHA` | build | the commit (`${_self.COMMIT_HASH}`) — becomes the `+sha` of the version |
| `APP_RELEASE_APPROVAL` | run | `yororis-cadre-6-2026-10-17-qa-only-dev` |
| `AUTH_SIGNUP_ENABLED` | run | `false` — the only value the app accepts |
| `AUTH_SESSION_SECRET` | run, SECRET | ≥ 32 random characters |
| `AUTH_DEMO_PASSWORD` | run, SECRET | the QA password of the cast (≥ 12 characters); the accounts are listed in the private QA sheet |
| `AI_API_URL` | run | `https://dev.orazaka.com/edge` |
| `AI_API_KEY` | run, SECRET | the service key of the Yororis account in Orazaka (the wellbeing pack's grant). Absent: the Moment says « not available right now », it never answers by itself |
| `APP_REGION` | run | `CA-QC` — the crisis line that answers |
| `APP_MOMENT_MINUTES`, `APP_MOMENTS_PER_DAY`, `APP_MOMENTS_PER_WEEK` | run | `25`, `20`, `100` on QA (the product's defaults are 25 minutes, 1 a day, 3 a week) |

## Apply (once; afterwards `main` deploys itself)

```sh
# 1. secrets, never printed (the file is created with mode 600)
VALUE="$(openssl rand -base64 48)" ~/.krizaka-worktrees/tools/env-set.sh @yororis AUTH_SESSION_SECRET
# 2. fill the spec in a temporary file, create the app, move it to its project, point the host at it
doctl apps create --spec "$(mktemp)" --project-id d9441511-826e-4086-81b9-0a3bab362b6e   # the spec with __NAME__ replaced
# 3. DNS: qa.yororis.com CNAME <the app's default ingress>   (Porkbun, tools/pb.py)
```

Verify: `curl -fsS https://qa.yororis.com/api/healthz`, `curl -s -o /dev/null -w '%{http_code}' -X POST https://qa.yororis.com/api/auth/sign-up` (403),
then sign in as a QA account and open a moment.

## Not done here, on purpose

- No production, no store, no outside person, no sign-up, no invitation code, no payment: the lawyer review comes first.
- No database: when members become real, a database on the shared dev cluster comes with its own decision.
