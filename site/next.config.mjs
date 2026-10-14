// The Yororis site is a static export (construction mode, AGENTS.md "The static-site exception"): `next build` writes
// plain files to out/ — no server, no route handler, no middleware, no image optimizer, no environment variable.
/** @type {import('next').NextConfig} */
export default {
  output: "export",
  distDir: ".next",
  trailingSlash: true, // /fr/ is fr/index.html: a free static host needs nothing more
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { globalNotFound: true }, // two root layouts (en at /, fr at /fr/): one 404 for both
};
