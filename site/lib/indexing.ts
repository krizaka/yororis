/**
 * One flag decides whether this deployment is open to search engines: `APP_SEARCH_INDEXING=off` at build time (the dev
 * site, set in .do/app.yaml) closes it — robots.txt `Disallow: /` with no sitemap, noindex on every page, and the
 * « development environment » line in the footer. Production flips it by configuration alone. A static export cannot send
 * an `X-Robots-Tag` header: the host (Cloudflare in front of App Platform) adds it where it can; robots.txt and the meta
 * are what this site itself guarantees.
 */
export const indexable = (env: Record<string, string | undefined> = process.env): boolean => env.APP_SEARCH_INDEXING?.trim().toLowerCase() !== "off";
