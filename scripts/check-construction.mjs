#!/usr/bin/env node
// Construction mode (krizaka/yororis docs/FRAMEWORK.md §5): checked on every push and pull request, before any code.
//   1. README.md opens with the banner, word for word.
//   2. docs/FRAMEWORK.md exists.
//   3. No workflow deploys or publishes anything: none names a deployment target, a deploy/ folder, a store
//      submission or a release artifact. The ONE exception (AGENTS.md, "The static-site exception"): `.do/app.yaml`
//      may exist and must declare a single static site built from `site/` — no service, worker, job, database or
//      function — and `site/` is a Next.js static export (`output: "export"`): no server code, route handler, middleware, server action or form (its own tests check the built page).
//   4. No environment variable is named after the product or a vendor (krizaka/.github#46): `<CONTEXT>_<THING>`.
//   5. The ONE other exception (AGENTS.md, "The member space"): `apps/web`, the member space and the organisation's console,
//      runs LOCALLY and in CI only, on 127.0.0.1, with a fictional cast. It is never deployed: no Dockerfile, no deployment
//      spec or platform file anywhere under apps/, no `output: "standalone"` (deployment packaging), its scripts bind
//      127.0.0.1, it is private, and its env module refuses a production start without APP_RELEASE_APPROVAL.
// Lifting construction mode is a written decision first, then a pull request that changes this file on purpose.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const BANNER =
  "Under construction — not deployed, not offered to anyone. We are studying the legal, ethical and clinical framework in parallel. No date.";
const FORBIDDEN = [/deploy\//i, /digitalocean/i, /\bdoctl\b/i, /vercel/i, /eas\s+submit/i, /eas\s+build/i, /upload-artifact/i, /action-gh-release/i, /gh\s+release/i, /npm\s+publish/i];

const root = process.cwd();
const failures = [];

const firstLine = (readFileSync(join(root, "README.md"), "utf8").split("\n")[0] ?? "").replace(/^>\s*/, "").replace(/\*\*/g, "").trim();
if (firstLine !== BANNER) failures.push(`README.md must open with the construction banner:\n  expected: ${BANNER}\n  found:    ${firstLine}`);

if (!existsSync(join(root, "docs/FRAMEWORK.md"))) failures.push("docs/FRAMEWORK.md is missing.");

const workflows = join(root, ".github/workflows");
for (const file of existsSync(workflows) ? readdirSync(workflows) : []) {
  const text = readFileSync(join(workflows, file), "utf8");
  for (const pattern of FORBIDDEN) if (pattern.test(text)) failures.push(`.github/workflows/${file} matches ${pattern}: no workflow deploys or publishes in construction mode.`);
}

// The static-site exception: exactly this, and nothing else.
const spec = join(root, ".do/app.yaml");
if (existsSync(spec)) {
  const yml = readFileSync(spec, "utf8");
  for (const kind of ["services", "workers", "jobs", "databases", "functions", "ingress", "envs"]) if (new RegExp(`^${kind}:`, "m").test(yml)) failures.push(`.do/app.yaml declares \`${kind}:\` — construction mode allows one static site only.`);
  const sites = yml.match(/^\s{2}- name:/gm) ?? [];
  if (!/^static_sites:/m.test(yml) || sites.length !== 1) failures.push(".do/app.yaml must declare exactly one static site.");
  if (!/^\s+source_dir: site$/m.test(yml)) failures.push(".do/app.yaml: the static site is built from site/.");
  if (!/^\s+output_dir: out$/m.test(yml)) failures.push(".do/app.yaml: the static site's output_dir is out (Next.js static export).");
  if (/^\s+(run_command|dockerfile_path):/m.test(yml)) failures.push(".do/app.yaml: no run command or Dockerfile for a static site.");
  // One build-time variable is allowed: APP_SEARCH_INDEXING (off on dev — noindex, robots Disallow /, no sitemap). Nothing else.
  if (/^\s+envs:/m.test(yml)) {
    const keys = [...yml.matchAll(/^\s+-?\s*key:\s*(\S+)/gm)].map((m) => m[1]);
    if (keys.length !== 1 || keys[0] !== "APP_SEARCH_INDEXING") failures.push(".do/app.yaml: the only variable of a static site is APP_SEARCH_INDEXING (build time).");
    if (/^\s+(-\s*)?type:\s*SECRET/m.test(yml)) failures.push(".do/app.yaml: no secret for a static site.");
  }
}
const SITE_SERVER = /(express|fastify|koa|hono|@nestjs|pg|mysql2?|mongoose|prisma|stripe|nodemailer)/;
const sitePkg = join(root, "site/package.json");
if (existsSync(sitePkg)) {
  const p = JSON.parse(readFileSync(sitePkg, "utf8"));
  if (p.dependencies && Object.keys(p.dependencies).length) failures.push("site/package.json: build tools go in devDependencies; the site ships no runtime dependency.");
  for (const d of Object.keys(p.devDependencies ?? {})) if (SITE_SERVER.test(d.replace(/^@[^/]+\//, ""))) failures.push(`site/package.json: "${d}" looks like server code; the site is static.`);
}

// The site is a Next.js STATIC EXPORT (`output: "export"`): next is a build tool here, never a server. No route handler,
// no middleware/proxy, no pages API, no server action, no env file, no env read in the site's code.
if (existsSync(sitePkg)) {
  const cfg = join(root, "site/next.config.mjs");
  if (!existsSync(cfg) || !/output:\s*["']export["']/.test(readFileSync(cfg, "utf8"))) failures.push('site/next.config.mjs must set `output: "export"` (a static export, no Next.js server).');
  const files = execSync("git ls-files site", { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  for (const f of files) {
    if (/^site\/(app|pages)\/(.*\/)?(route|api\/.*)\.(t|j)sx?$/.test(f) || /^site\/(middleware|proxy)\.(t|j)sx?$/.test(f) || /^site\/\.env/.test(f)) failures.push(`${f}: server code or an env file — the site is a static export.`);
    if (/\.(t|m?j)sx?$/.test(f) && f !== "site/tests/site.test.mjs") {
      const src = readFileSync(join(root, f), "utf8");
      if (/["']use server["']/.test(src)) failures.push(`${f}: a server action — the site is a static export.`);
      if (/process\.env\.(?!APP_VERSION\b|APP_VERSION_SHA\b|APP_SEARCH_INDEXING\b|NODE_ENV\b)/.test(src)) failures.push(`${f}: reads an environment variable other than the build's APP_VERSION / APP_VERSION_SHA / APP_SEARCH_INDEXING.`);
    }
  }
}

// The member space: a non-deployed app. Anything that would ship it is refused; the shape that keeps it local is required.
const appFiles = execSync("git ls-files --cached --others --exclude-standard apps", { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
const SHIPPING = /(^|\/)(Dockerfile[^/]*|\.dockerignore|app\.ya?ml|[^/]*\.app\.ya?ml|docker-compose[^/]*|vercel\.json|netlify\.toml|fly\.toml|render\.ya?ml|railway[^/]*|Procfile|serverless\.ya?ml|\.do|deploy)(\/|$)/i;
for (const f of appFiles) if (SHIPPING.test(f)) failures.push(`${f}: a deployment file under apps/ — the member space is never deployed in construction mode.`);
if (appFiles.length) {
  const pkgPath = join(root, "apps/web/package.json");
  if (!existsSync(pkgPath)) failures.push("apps/ may hold only apps/web (the member space).");
  else {
    const p = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (p.private !== true) failures.push("apps/web/package.json must be private.");
    for (const name of ["dev", "start"]) if (!/(^|\s)-H 127\.0\.0\.1(\s|$)/.test(p.scripts?.[name] ?? "")) failures.push(`apps/web/package.json: the "${name}" script must listen on 127.0.0.1 only (-H 127.0.0.1).`);
    for (const name of Object.keys(p.scripts ?? {})) if (/deploy|publish|release|docker|doctl|vercel/i.test(`${name} ${p.scripts[name]}`)) failures.push(`apps/web/package.json: script "${name}" ships something — the member space is local.`);
    const cfg = join(root, "apps/web/next.config.mjs");
    if (existsSync(cfg) && /output:\s*["']standalone["']/.test(readFileSync(cfg, "utf8"))) failures.push('apps/web/next.config.mjs: `output: "standalone"` is deployment packaging.');
    const env = join(root, "apps/web/lib/env.ts");
    if (!existsSync(env) || !/APP_RELEASE_APPROVAL/.test(readFileSync(env, "utf8"))) failures.push("apps/web/lib/env.ts must refuse a production start without APP_RELEASE_APPROVAL.");
  }
  if (existsSync(spec) && /apps\//.test(readFileSync(spec, "utf8"))) failures.push(".do/app.yaml must not reference apps/: only site/ is deployed.");
}

// An env-like name (FOO_BAR) starting with the product or a vendor, anywhere in the tracked text.
export const VENDOR_OR_PRODUCT_ENV = /\b(?:NEXT_PUBLIC_|EXPO_PUBLIC_)?(?:YORORIS|KRIZAKA|BUNNY|MAILGUN|RESEND|STRIPE|TURNSTILE|EXPO|GOOGLE|FACEBOOK|VERCEL|REDIS|DIGITALOCEAN|OPENAI|ANTHROPIC|FIREBASE)_[A-Z0-9_]*[A-Z0-9]\b/;
const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" }).split("\n").filter((f) => f && !/\.(svg|png|jpg|webp|lock)$/.test(f) && f !== "scripts/check-construction.mjs");
for (const file of tracked) {
  const hit = readFileSync(join(root, file), "utf8").match(VENDOR_OR_PRODUCT_ENV);
  if (hit) failures.push(`${file}: "${hit[0]}" — an environment variable is named <CONTEXT>_<THING>, never after the product or a vendor (krizaka/.github#46).`);
}

if (failures.length) {
  console.error(`Construction mode check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Construction mode: banner in place, FRAMEWORK.md present, no deployment or publishing workflow (but the one static site), the member space local only, env names by context.");
