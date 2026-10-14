import type { MetadataRoute } from "next";
import { ORIGIN } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${ORIGIN}/`, alternates: { languages: { en: `${ORIGIN}/`, fr: `${ORIGIN}/fr/` } } },
    { url: `${ORIGIN}/fr/`, alternates: { languages: { en: `${ORIGIN}/`, fr: `${ORIGIN}/fr/` } } },
  ];
}
