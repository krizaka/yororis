// One app serves www.yororis.com: the public pages (the home in English and French, the changelog, robots, sitemap, llms.txt) are the
// static export of site/, copied by the image build into public/_home and served through the rewrites below; the member space (sign-in,
// account, the moment, the organiser's console) and its API are this app. `npm run dev|start` answer 127.0.0.1 only; no Dockerfile or
// deployment spec lives under apps/ (the image is built from deploy/docker/Dockerfile).
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// The portraits and the home's films live on the media CDN (never in the repository); nothing else may load an image or a video from outside.
const cdn = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? "https://krizaka-assets.b-cdn.net").replace(/\/$/, "");
const production = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  // Inline scripts are Next's hydration data; eval and the dev server's socket are for the local dev run only.
  production ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${cdn}`,
  `media-src 'self' blob: ${cdn}`,
  "font-src 'self' data:",
  production ? "connect-src 'self'" : "connect-src 'self' ws: http://127.0.0.1:*",
  "frame-ancestors 'none'",
].join("; ");

/** The files of the static home, as `[urlPath, publicPath]` (a page answers with and without its trailing slash and as index.html). */
export function homeRoutes(root = join(process.cwd(), "public", "_home")) {
  if (!existsSync(root)) return [];
  const routes = [];
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (name === "_next" && !rel) continue; // the hashed assets are merged into the app's own (deploy/docker/Dockerfile)
      const next = rel ? `${rel}/${name}` : name;
      if (statSync(abs).isDirectory()) walk(abs, next);
      else if (name === "index.html") {
        routes.push([rel ? `/${rel}` : "/", `/_home/${next}`], [rel ? `/${rel}/` : "/", `/_home/${next}`], [rel ? `/${rel}/index.html` : "/index.html", `/_home/${next}`]);
      } else routes.push([`/${next}`, `/_home/${next}`]);
    }
  };
  walk(root, "");
  // 404.html is the platform's page of the static site: the app has its own.
  return routes.filter(([from, to], i, all) => from !== "/404.html" && !from.startsWith("/404/") && !from.startsWith("/_not-found") && all.findIndex(([f]) => f === from) === i && !!to);
}

// The member space and its API: never indexed. Every other path (the home, the changelog, robots, sitemap, llms.txt) is public.
const MEMBER = "/:locale(en|fr)/:rest(sign-in|forgot|reset|account|moment|admin)/:more*";
const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
const common = [{ key: "Content-Security-Policy", value: csp }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "same-origin" }];

/** @type {import('next').NextConfig} */
const config = {
  // The container image runs `node server.js` from the standalone output (deploy/docker/Dockerfile sets APP_STANDALONE=1);
  // `next start` is for the local run and CI.
  ...(process.env.APP_STANDALONE === "1" ? { output: "standalone" } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
  // The static home's links end with a slash (`/fr/`, `/fr/changelog/`): both forms are answered as written, never redirected.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const home = homeRoutes();
    // `/fr` is also the signed-in member's home: without the sign-in cookie it is the French home page.
    const guarded = (from) => (from === "/fr" || from === "/fr/" ? { missing: [{ type: "cookie", key: "yororis_auth" }] } : {});
    return { beforeFiles: home.map(([source, destination]) => ({ source, destination, ...guarded(source) })), afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
      { source: "/:path*", headers: common },
      { source: "/api/:path*", headers: [noindex] },
      { source: MEMBER, headers: [noindex] },
      { source: "/en", headers: [noindex] },
      { source: "/fr", has: [{ type: "cookie", key: "yororis_auth" }], headers: [noindex] },
      { source: "/_home/:path*", headers: [noindex] },
      // dev.yororis.com serves nothing to index: its few paths (the API, /.well-known) are noindex (the rest answers 308 to www at the ingress).
      { source: "/:path*", has: [{ type: "host", value: "dev.yororis.com" }], headers: [noindex] },
    ];
  },
};

export default config;
