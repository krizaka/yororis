/**
 * The media of the product live on the CDN, never in the repository (krizaka-com AGENTS §5.2). A portrait is one of the
 * fictitious personas of the shared library (`people/personas/ui/<name>-512.webp`, generated people who do not exist);
 * the host is `NEXT_PUBLIC_MEDIA_CDN_URL`, read at build.
 */
export const MEDIA_CDN = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL ?? "https://krizaka-assets.b-cdn.net").replace(/\/$/, "");
export const portrait = (persona: string) => `${MEDIA_CDN}/people/personas/ui/${persona}-512.webp`;
