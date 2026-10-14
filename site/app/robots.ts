import type { MetadataRoute } from "next";
import { CRAWLERS } from "@/lib/crawlers";
import { ORIGIN } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }, ...CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" }))],
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}
