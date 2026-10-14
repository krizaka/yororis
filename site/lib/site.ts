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

/* The Krizaka family (NAV-SYS). Today the footer renders it; when `@krizaka/ui/sites` and `NavBar.Family` ship, this
   list is replaced by the package's data and <Family/> (components/Family.tsx) by the switcher — nothing else changes. */
export const FAMILY = {
  company: { id: "krizaka", href: KRIZAKA },
  products: [
    { id: "orazaka", name: "Orazaka", href: "https://dev.orazaka.com" },
    { id: "orochia", name: "Orochia", href: "https://dev.orochia.com" },
    { id: "yasakia", name: "Yasakia", href: "https://dev.yasakia.com" },
    { id: "yororis", name: "Yororis", href: ORIGIN, current: true },
  ],
  openSource: [
    { id: "ui", href: "https://ui.krizaka.com" },
    { id: "java", href: "https://java.krizaka.com" },
  ],
  github: "https://github.com/krizaka",
} as const;
