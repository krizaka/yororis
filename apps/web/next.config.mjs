// Construction mode (docs/FRAMEWORK.md §5): this app runs locally and in CI only — no Dockerfile, no deployment spec,
// no workflow that ships it (scripts/check-construction.mjs). It answers 127.0.0.1 only (see the scripts of package.json).
// The portraits live on the media CDN (never in the repository); nothing else may load an image from outside.
const cdn = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? "https://krizaka-assets.b-cdn.net").replace(/\/$/, "");
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${cdn}`,
  "font-src 'self' data:",
  "connect-src 'self' ws: http://127.0.0.1:*",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: csp }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "same-origin" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default config;
