import type { MetadataRoute } from "next";
import { CRAWLERS } from "@/lib/crawlers";
import { indexable } from "@/lib/indexing";
import { ORIGIN } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // Not indexed (dev, preview): closed, and no sitemap to advertise.
  if (!indexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/" }, ...CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" }))],
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}
