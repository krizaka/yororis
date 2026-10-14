/* Structure of the site: links and ids. Every word is a message (messages/en.json, messages/fr.json). */
export const ORIGIN = "https://dev.yororis.com";
export const CONTACT = "https://www.krizaka.com/contact?topic=yororis";
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
