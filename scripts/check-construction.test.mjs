// The construction guard, on fixtures: it lets the member space exist as a local app and refuses anything that ships it.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BANNER = "Under construction — not deployed, not offered to anyone. We are studying the legal, ethical and clinical framework in parallel. No date.";

function repo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "construction-"));
  const put = (path, text) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  put("README.md", `> **${BANNER}**\n`);
  put("docs/FRAMEWORK.md", "# framework\n");
  put("apps/web/package.json", JSON.stringify({ private: true, scripts: { dev: "next dev -H 127.0.0.1 -p 3400", start: "next start -H 127.0.0.1 -p 3400", build: "next build" } }));
  put("apps/web/lib/env.ts", "export const a = 'APP_RELEASE_APPROVAL';\n");
  put("apps/web/next.config.mjs", "export default {};\n");
  for (const [path, text] of Object.entries(files)) put(path, text);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(join(here, "check-construction.mjs"), join(dir, "scripts/check-construction.mjs"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return dir;
}
const run = (dir) => spawnSync("node", ["scripts/check-construction.mjs"], { cwd: dir, encoding: "utf8" });

test("a local member space passes", () => assert.equal(run(repo()).status, 0));

test("a Dockerfile or a deployment spec under apps/ is refused", () => {
  for (const path of ["apps/web/Dockerfile", "apps/web/app.yaml", "apps/web/deploy/spec.yaml", "apps/web/vercel.json", "apps/web/web.app.yaml"]) {
    const r = run(repo({ [path]: "x\n" }));
    assert.equal(r.status, 1, path);
    assert.match(r.stderr, /never deployed/, path);
  }
});

test("the member space must listen on 127.0.0.1 and stay private", () => {
  const open = run(repo({ "apps/web/package.json": JSON.stringify({ private: true, scripts: { dev: "next dev", start: "next start -H 0.0.0.0" } }) }));
  assert.equal(open.status, 1);
  assert.match(open.stderr, /127\.0\.0\.1/);
  assert.match(run(repo({ "apps/web/package.json": JSON.stringify({ scripts: { dev: "next dev -H 127.0.0.1", start: "next start -H 127.0.0.1" } }) })).stderr, /private/);
});

test("a script that ships, or a standalone build, is refused", () => {
  assert.equal(run(repo({ "apps/web/package.json": JSON.stringify({ private: true, scripts: { dev: "next dev -H 127.0.0.1", start: "next start -H 127.0.0.1", deploy: "doctl apps create" } }) })).status, 1);
  assert.match(run(repo({ "apps/web/next.config.mjs": 'export default { output: "standalone" };\n' })).stderr, /standalone/);
});

test("the production-start refusal must exist, and .do/app.yaml must not point at apps/", () => {
  assert.match(run(repo({ "apps/web/lib/env.ts": "export {};\n" })).stderr, /APP_RELEASE_APPROVAL/);
  const spec = "name: x\nstatic_sites:\n  - name: site\n    source_dir: site\n    output_dir: out\n    build_command: cd apps/web && npm run build\n";
  assert.match(run(repo({ ".do/app.yaml": spec })).stderr, /must not reference apps\//);
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
