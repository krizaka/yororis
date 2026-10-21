// The construction / QA-only guard, on fixtures: it lets the member space exist (locally, in CI, and as the one QA deployment in deploy/)
// and refuses anything that would open it to anyone else or ship it by another road.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BANNER = "Under construction — QA only, not offered to anyone. We are studying the legal, ethical and clinical framework in parallel. No date.";

const ENV_TS = "export const a = 'APP_RELEASE_APPROVAL AUTH_SIGNUP_ENABLED';\n";
const SPEC = `name: yororis-qa
region: tor
domains:
  - domain: qa.yororis.com
    type: PRIMARY
services:
  - name: web
    dockerfile_path: deploy/docker/Dockerfile
    source_dir: /
    http_port: 8080
    instance_size_slug: apps-s-1vcpu-0.5gb
    health_check:
      http_path: /api/healthz
    envs:
      - { key: APP_RELEASE_APPROVAL, scope: RUN_TIME, value: "yororis-cadre-6-2026-10-17-qa-only-dev" }
      - { key: AUTH_SIGNUP_ENABLED, scope: RUN_TIME, value: "false" }
      - { key: AUTH_SESSION_SECRET, scope: RUN_TIME, type: SECRET, value: "__AUTH_SESSION_SECRET__" }
      - { key: AI_API_KEY, scope: RUN_TIME, type: SECRET, value: "__AI_API_KEY__" }
      - { key: AI_API_URL, scope: RUN_TIME, value: "https://dev.orazaka.com/edge" }
`;
const DOCKERFILE = "FROM node:22-alpine\nENV APP_STANDALONE=1 AUTH_SESSION_SECRET=build-only-placeholder\nCMD [\"node\", \"server.js\"]\n";

function repo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "construction-"));
  const put = (path, text) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  put("README.md", `> **${BANNER}**\n`);
  put("docs/FRAMEWORK.md", "# framework\n");
  put("apps/web/package.json", JSON.stringify({ private: true, scripts: { dev: "next dev -H 127.0.0.1 -p 3400", start: "next start -H 127.0.0.1 -p 3400", build: "next build" } }));
  put("apps/web/lib/env.ts", ENV_TS);
  put("apps/web/next.config.mjs", "export default {};\n");
  for (const [path, text] of Object.entries(files)) put(path, text);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(join(here, "check-construction.mjs"), join(dir, "scripts/check-construction.mjs"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return dir;
}
const run = (dir) => spawnSync("node", ["scripts/check-construction.mjs"], { cwd: dir, encoding: "utf8" });
const qa = (files = {}) => repo({ "deploy/digitalocean/qa.app.yaml": SPEC, "deploy/docker/Dockerfile": DOCKERFILE, ...files });

test("a local member space passes", () => assert.equal(run(repo()).status, 0));

test("the member space with its one QA deployment in deploy/ passes", () => {
  const r = run(qa());
  assert.equal(r.status, 0, r.stderr);
});

test("a Dockerfile or a deployment spec under apps/ is refused: deployment files live in deploy/", () => {
  for (const path of ["apps/web/Dockerfile", "apps/web/app.yaml", "apps/web/deploy/spec.yaml", "apps/web/vercel.json", "apps/web/web.app.yaml"]) {
    const r = run(repo({ [path]: "x\n" }));
    assert.equal(r.status, 1, path);
    assert.match(r.stderr, /deploy\/ only/, path);
  }
});

test("the member space must listen on 127.0.0.1 and stay private", () => {
  const open = run(repo({ "apps/web/package.json": JSON.stringify({ private: true, scripts: { dev: "next dev", start: "next start -H 0.0.0.0" } }) }));
  assert.equal(open.status, 1);
  assert.match(open.stderr, /127\.0\.0\.1/);
  assert.match(run(repo({ "apps/web/package.json": JSON.stringify({ scripts: { dev: "next dev -H 127.0.0.1", start: "next start -H 127.0.0.1" } }) })).stderr, /private/);
});

test("a script that ships is refused; standalone packaging only for the image build", () => {
  assert.equal(run(repo({ "apps/web/package.json": JSON.stringify({ private: true, scripts: { dev: "next dev -H 127.0.0.1", start: "next start -H 127.0.0.1", deploy: "doctl apps create" } }) })).status, 1);
  assert.match(run(repo({ "apps/web/next.config.mjs": 'export default { output: "standalone" };\n' })).stderr, /APP_STANDALONE/);
  const conditional = run(repo({ "apps/web/next.config.mjs": 'export default { ...(process.env.APP_STANDALONE === "1" ? { output: "standalone" } : {}) };\n' }));
  assert.equal(conditional.status, 0, conditional.stderr);
});

test("the production-start refusal and the closed sign-up flag must exist, and .do/app.yaml must not point at apps/", () => {
  assert.match(run(repo({ "apps/web/lib/env.ts": "export {};\n" })).stderr, /APP_RELEASE_APPROVAL/);
  assert.match(run(repo({ "apps/web/lib/env.ts": "export const a = 'APP_RELEASE_APPROVAL';\n" })).stderr, /AUTH_SIGNUP_ENABLED/);
  const spec = "name: x\nstatic_sites:\n  - name: site\n    source_dir: site\n    output_dir: out\n    build_command: cd apps/web && npm run build\n";
  assert.match(run(repo({ ".do/app.yaml": spec })).stderr, /must not reference apps\//);
});

test("deploy/ holds the two files and nothing else, and not without the app", () => {
  assert.match(run(qa({ "deploy/docker/extra.sh": "x\n" })).stderr, /holds only/);
  assert.match(run(qa({ "deploy/digitalocean/prod.app.yaml": SPEC })).stderr, /holds only/);
});

test("the QA spec: one service, no database, the smallest instance, a closed sign-up, secrets typed SECRET", () => {
  const bad = (from, to) => run(qa({ "deploy/digitalocean/qa.app.yaml": SPEC.replace(from, to) }));
  assert.match(bad("services:", "static_sites:\n  - name: s\nservices:").stderr, /static_sites/);
  assert.match(bad("name: yororis-qa", "name: yororis-qa\ndatabases:\n  - name: pg").stderr, /databases/);
  assert.match(bad("apps-s-1vcpu-0.5gb", "apps-s-1vcpu-2gb").stderr, /smallest instance/);
  assert.match(bad('{ key: AUTH_SIGNUP_ENABLED, scope: RUN_TIME, value: "false" }', '{ key: AUTH_SIGNUP_ENABLED, scope: RUN_TIME, value: "true" }').stderr, /sign-up is closed/);
  assert.match(bad("/api/healthz", "/").stderr, /health check/);
  assert.match(bad('value: "yororis-cadre-6-2026-10-17-qa-only-dev"', 'value: ""').stderr, /APP_RELEASE_APPROVAL/);
  assert.match(bad("type: SECRET, value: \"__AI_API_KEY__\"", 'value: "oz_realvalue"').stderr, /AI_API_KEY must be a SECRET/);
  assert.match(bad('value: "__AUTH_SESSION_SECRET__"', 'value: "a-real-secret"').stderr, /AUTH_SESSION_SECRET must be a SECRET/);
  // Invited testers only (2026-10-21): the accounts database of the shared cluster, URL and CA as SECRETs; nothing else of the family.
  const secretDb = '      - { key: DATABASE_URL, scope: RUN_TIME, type: SECRET, value: "__DATABASE_URL__" }\n      - { key: DATABASE_CA_CERT, scope: RUN_TIME, type: SECRET, value: "__DATABASE_CA_CERT__" }';
  assert.equal(bad("    envs:", `    envs:\n${secretDb}`).status, 0);
  assert.match(bad("    envs:", "    envs:\n      - { key: DATABASE_URL, scope: RUN_TIME, value: \"postgres://x\" }").stderr, /DATABASE_URL must be a SECRET/);
  assert.match(bad("    envs:", "    envs:\n      - { key: DATABASE_HOST, scope: RUN_TIME, value: \"x\" }").stderr, /accounts one/);
  assert.match(bad("  - name: web", "  - name: web\n  - name: worker").stderr, /exactly one service/);
});

test("the QA app never takes the public site's host", () => {
  for (const domain of ["dev.yororis.com", "yororis.com", "www.yororis.com"]) assert.match(run(qa({ "deploy/digitalocean/qa.app.yaml": SPEC.replace("qa.yororis.com", domain) })).stderr, /public static site/, domain);
});

test("an image never bakes a secret: only build-only placeholders", () => {
  assert.match(run(qa({ "deploy/docker/Dockerfile": "FROM node\nENV AUTH_DEMO_PASSWORD=hunter2hunter2\n" })).stderr, /only build-only placeholders/);
  assert.match(run(qa({ "deploy/docker/Dockerfile": "FROM node\nENV AI_API_KEY=oz_abcdef\n" })).stderr, /only build-only placeholders/);
});

test("a workflow may build the image, never deploy it", () => {
  const build = "name: CI\njobs:\n  image:\n    steps:\n      - run: docker build -f deploy/docker/Dockerfile -t yororis-qa .\n";
  assert.equal(run(qa({ ".github/workflows/ci.yml": build })).status, 0);
  assert.match(run(qa({ ".github/workflows/ci.yml": `${build}      - run: doctl apps create --spec deploy/digitalocean/qa.app.yaml\n` })).stderr, /no workflow deploys/);
  assert.match(run(qa({ ".github/workflows/ci.yml": `${build}      - run: cat deploy/digitalocean/qa.app.yaml\n` })).stderr, /no workflow deploys/);
});

const SITE_SPEC = (envs) => `name: yororis-dev\nregion: tor\nstatic_sites:\n  - name: site\n    source_dir: site\n    build_command: npm ci && npm run build\n    output_dir: out\n${envs}`;

test("the static site may carry exactly one build-time variable: APP_SEARCH_INDEXING", () => {
  const ok = run(repo({ ".do/app.yaml": SITE_SPEC('    envs:\n      - key: APP_SEARCH_INDEXING\n        scope: BUILD_TIME\n        value: "off"\n') }));
  assert.equal(ok.status, 0, ok.stderr);
  const other = run(repo({ ".do/app.yaml": SITE_SPEC('    envs:\n      - key: DATABASE_URL\n        scope: BUILD_TIME\n        value: "x"\n') }));
  assert.equal(other.status, 1);
  assert.match(other.stderr, /only variable/);
  const two = run(repo({ ".do/app.yaml": SITE_SPEC('    envs:\n      - key: APP_SEARCH_INDEXING\n        value: "off"\n      - key: API_KEY\n        value: "y"\n') }));
  assert.equal(two.status, 1);
});

test("the static site's ingress may only redirect (308) or serve the site: dev keeps /.well-known, every other page goes to www", () => {
  const ingress = `ingress:
  rules:
    - match: { authority: { exact: yororis.com } }
      redirect: { authority: www.yororis.com, redirect_code: 308 }
    - match: { authority: { exact: dev.yororis.com }, path: { prefix: /.well-known } }
      component: { name: site }
    - match: { authority: { exact: dev.yororis.com } }
      redirect: { authority: www.yororis.com, redirect_code: 308 }
    - match: { path: { prefix: / } }
      component: { name: site }
`;
  const ok = run(repo({ ".do/app.yaml": SITE_SPEC("") + ingress }));
  assert.equal(ok.status, 0, ok.stderr);
  const other = run(repo({ ".do/app.yaml": SITE_SPEC("") + ingress.replace("component: { name: site }", "component: { name: api }") }));
  assert.equal(other.status, 1);
  assert.match(other.stderr, /ingress/);
});
