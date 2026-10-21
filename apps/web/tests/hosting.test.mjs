// One app serves www.yororis.com: the home is the static export of site/ copied into public/_home and rewritten; the member space is
// noindex; dev.yororis.com shuts robots.txt. The rewrites, the headers and the proxy, on fixtures.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const { default: config, homeRoutes } = await import("../next.config.mjs");

function home(files) {
  const root = mkdtempSync(join(tmpdir(), "home-"));
  for (const f of files) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), "x");
  }
  return root;
}
const FILES = ["index.html", "fr/index.html", "changelog/index.html", "fr/changelog/index.html", "changelog/feed.xml", "robots.txt", "sitemap.xml", "llms.txt", "404.html", "404/index.html", "_not-found/index.html", "_next/static/chunks/a.js", "__next._tree.txt"];

test("the home's pages answer with and without the trailing slash and as index.html; files answer as they are; 404 and _next are not routed", () => {
  const routes = Object.fromEntries(homeRoutes(home(FILES)));
  assert.equal(routes["/"], "/_home/index.html");
  assert.equal(routes["/fr"], "/_home/fr/index.html");
  assert.equal(routes["/fr/"], "/_home/fr/index.html");
  assert.equal(routes["/fr/changelog/"], "/_home/fr/changelog/index.html");
  assert.equal(routes["/changelog/feed.xml"], "/_home/changelog/feed.xml");
  assert.equal(routes["/robots.txt"], "/_home/robots.txt");
  assert.equal(routes["/__next._tree.txt"], "/_home/__next._tree.txt");
  for (const never of ["/404.html", "/404/", "/_not-found", "/_next/static/chunks/a.js"]) assert.ok(!(never in routes), never);
});

test("no home, no rewrite (a local run or CI without the static export)", () => {
  assert.deepEqual(homeRoutes(join(tmpdir(), "does-not-exist-yororis")), []);
});

test("/fr is the home only without the sign-in cookie (it is also the French member's dashboard)", async () => {
  const here = process.cwd();
  const work = mkdtempSync(join(tmpdir(), "work-"));
  const root = join(work, "public", "_home");
  for (const f of FILES) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), "x");
  }
  process.chdir(work); // the lookup is relative to the working directory (apps/web)
  try {
    const { beforeFiles } = await config.rewrites();
    const by = Object.fromEntries(beforeFiles.map((r) => [r.source, r]));
    for (const guarded of ["/fr", "/fr/"]) assert.deepEqual(by[guarded].missing, [{ type: "cookie", key: "yororis_auth" }], guarded);
    for (const open of ["/", "/fr/changelog", "/changelog/", "/robots.txt"]) assert.equal(by[open].missing, undefined, open);
    assert.equal(by["/fr"].destination, "/_home/fr/index.html");
  } finally {
    process.chdir(here);
  }
});

test("the member space and the API are noindex; the home is not; the development host is noindex", async () => {
  const headers = await config.headers();
  const robots = (path, extra = {}) => headers.some((h) => h.headers.some((x) => x.key === "X-Robots-Tag") && h.source === path && JSON.stringify(h.has ?? null) === JSON.stringify(extra.has ?? null));
  assert.ok(robots("/api/:path*"));
  assert.ok(robots("/en"));
  assert.ok(robots("/_home/:path*"));
  assert.ok(robots("/fr", { has: [{ type: "cookie", key: "yororis_auth" }] }), "/fr is noindex only for a signed-in member");
  assert.ok(!robots("/fr"), "the French home is indexed");
  assert.ok(!robots("/"), "the English home is indexed");
  assert.ok(headers.some((h) => h.has?.[0]?.value === "dev.yororis.com" && h.headers.some((x) => x.key === "X-Robots-Tag")));
  const member = headers.find((h) => /sign-in\|forgot\|reset\|account\|moment\|admin/.test(h.source));
  assert.ok(member?.headers.some((x) => x.key === "X-Robots-Tag"));
  const csp = headers[0].headers.find((x) => x.key === "Content-Security-Policy").value;
  assert.match(csp, /media-src 'self' blob: https:\/\/krizaka-assets\.b-cdn\.net/);
});

test("the proxy: the public pages pass, the dev host's robots.txt shuts the door, a member address without a language gets one", async () => {
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../proxy.ts");
  const req = (path, headers = {}) => new NextRequest(`http://127.0.0.1:3400${path}`, { headers });
  for (const path of ["/", "/changelog", "/changelog/", "/robots.txt"]) assert.equal(proxy(req(path)), undefined, path);
  const dev = proxy(req("/robots.txt", { host: "dev.yororis.com" }));
  assert.equal(await dev.text(), "User-agent: *\nDisallow: /\n");
  assert.match(dev.headers.get("x-robots-tag"), /noindex/);
  const redirect = proxy(req("/account", { "accept-language": "fr-CA,fr;q=0.9" }));
  assert.equal(new URL(redirect.headers.get("location")).pathname, "/fr/account");
  assert.equal(proxy(req("/en/account")), undefined);
});
