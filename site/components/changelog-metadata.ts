import type { Metadata } from "next";

import { getMessages, type Locale } from "@/lib/messages";
import { ORIGIN } from "@/lib/site";

import { metadataFor } from "./Shell";

/** The metadata of /changelog in a language: the site's cards (Open Graph, Twitter, hreflang) with the page's own title, description and address. */
export function changelogMetadata(locale: Locale): Metadata {
  const base = metadataFor(locale);
  const c = getMessages(locale).changelogPage;
  const url = `${ORIGIN}${locale === "en" ? "" : "/fr"}/changelog/`;
  return {
    ...base,
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: url, languages: { en: `${ORIGIN}/changelog/`, fr: `${ORIGIN}/fr/changelog/`, "x-default": `${ORIGIN}/changelog/` }, types: { "application/rss+xml": "/changelog/feed.xml" } },
    openGraph: { ...base.openGraph, title: c.metaTitle, description: c.metaDescription, url },
    twitter: { ...base.twitter, title: c.metaTitle, description: c.metaDescription },
  };
}
