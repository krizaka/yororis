import { KRIZAKA, ORIGIN, REPO } from "./site";
import type { Locale } from "./messages";

/** The Krizaka Organization, defined by www.krizaka.com: every JSON-LD node of the family points back to it. */
export const ORG_ID = `${KRIZAKA}/#organization`;
const ORG = { "@type": "Organization", "@id": ORG_ID, name: "Krizaka", url: KRIZAKA };

/** The site and the product it presents. Words are the page's own messages; nothing is offered, so there is no `offers`,
    no download and no application address (construction mode). */
export function siteJsonLd(locale: Locale, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${ORIGIN}/#website`, url: `${ORIGIN}/`, name, inLanguage: ["en", "fr"], publisher: ORG },
      {
        "@type": "SoftwareApplication",
        "@id": `${ORIGIN}/#software`,
        name: "Yororis",
        url: `${ORIGIN}/`,
        description,
        inLanguage: locale === "en" ? "en-CA" : "fr-CA",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        codeRepository: REPO,
        publisher: ORG,
        isPartOf: { "@id": `${ORIGIN}/#website` },
      },
    ],
  };
}
