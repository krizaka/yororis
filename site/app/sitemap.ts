import type { MetadataRoute } from "next";
import { indexable } from "@/lib/indexing";
import { ORIGIN } from "@/lib/site";

export const dynamic = "force-static";

/* Both languages, each naming the other (hreflang), dated by the build. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexable()) return [];
  const lastModified = new Date();
  const languages = { en: `${ORIGIN}/`, fr: `${ORIGIN}/fr/` };
  return [
    { url: `${ORIGIN}/`, lastModified, alternates: { languages } },
    { url: `${ORIGIN}/fr/`, lastModified, alternates: { languages } },
  ];
}
