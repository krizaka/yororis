/* Structure of the site: links and ids. Every word is a message (messages/en.json, messages/fr.json). */
export const ORIGIN = "https://www.yororis.com";
/** The contact page of krizaka.com, in the reader's language (the French reader lands on the French page). */
export const contactFor = (locale: "en" | "fr") => `https://www.krizaka.com/${locale === "fr" ? "fr/" : ""}contact?topic=yororis`;
export const CONTACT = contactFor("en");
export const KRIZAKA = "https://www.krizaka.com";
export const REPO = "https://github.com/krizaka/yororis";
export const FRAMEWORK = `${REPO}/blob/main/docs/FRAMEWORK.md`;
export const ADR_055 = "https://github.com/krizaka/orazaka/blob/main/docs/adr/ADR-055-regulated-controls-and-the-wellbeing-pack.md";
export const ADR_051 = "https://github.com/krizaka/orazaka/blob/main/docs/adr/ADR-051-sensitive-controls.md";

/** The three sections of this site, in the bar's centre (NAV-SYS: this site only, never the other sites). */
export const SECTIONS = [
  { id: "what", key: "what" },
  { id: "how", key: "how" },
  { id: "not", key: "not" },
] as const;

/* The captures of the local member space (apps/web), on Bunny — hashed files, never in the repository. Shown only as
   pictures, labelled "in development, not available". */
const CDN = "https://krizaka-assets.b-cdn.net/site/products/yororis/gallery";
export const SHOTS = [
  { id: "home", desktop: { src: `${CDN}/home-desktop.d3fe677abe.webp`, width: 1440, height: 900 }, phone: { src: `${CDN}/home-phone.11203dcac9.webp`, width: 780, height: 1688 } },
  { id: "account", desktop: { src: `${CDN}/account-desktop.af2fe3d5a1.webp`, width: 1440, height: 900 }, phone: { src: `${CDN}/account-phone.a0f15edb86.webp`, width: 780, height: 1688 } },
  { id: "members", desktop: { src: `${CDN}/members-desktop.b48e998ce4.webp`, width: 1440, height: 900 }, phone: { src: `${CDN}/members-phone.5e620d5caa.webp`, width: 780, height: 1688 } },
] as const;

/* The real Moment take (the member space's text moment, recorded on the local version with a fictional cast): a phone, 29 s,
   H.264, on Bunny under the product's own folder — hashed, never in the repository (recorded in krizaka-com lib/cdn-manifest.json). */
const TAKE_CDN = "https://krizaka-assets.b-cdn.net/site/products/yororis/tour";
export const TAKE = {
  mp4: `${TAKE_CDN}/moment-fr-phone.f63fe27a62.mp4`,
  poster: `${TAKE_CDN}/moment-fr-phone.2b2c262fed.jpg`,
  width: 412,
  height: 914,
  seconds: 29,
} as const;
