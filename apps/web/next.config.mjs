// QA-only mode (docs/FRAMEWORK.md §5, scripts/check-construction.mjs): this app runs locally, in CI and as the one QA deployment on dev
// (deploy/). No Dockerfile or deployment spec lives under apps/: the image is built from deploy/docker/Dockerfile. `npm run dev|start`
// answer 127.0.0.1 only.
// The portraits live on the media CDN (never in the repository); nothing else may load an image from outside.
const cdn = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? "https://krizaka-assets.b-cdn.net").replace(/\/$/, "");
const production = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  // Inline scripts are Next's hydration data; eval and the dev server's socket are for the local dev run only.
  production ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${cdn}`,
  "font-src 'self' data:",
  production ? "connect-src 'self'" : "connect-src 'self' ws: http://127.0.0.1:*",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const config = {
  // The container image runs `node server.js` from the standalone output (deploy/docker/Dockerfile sets APP_STANDALONE=1);
  // `next start` is for the local run and CI.
  ...(process.env.APP_STANDALONE === "1" ? { output: "standalone" } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: csp }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "same-origin" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default config;
