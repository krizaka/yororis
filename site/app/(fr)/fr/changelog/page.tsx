import type { Metadata } from "next";

import { ChangelogRoute } from "@/components/ChangelogPage";
import { getMessages } from "@/lib/messages";
import { ORIGIN } from "@/lib/site";

const c = getMessages("fr").changelogPage;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: {
    canonical: `${ORIGIN}/fr/changelog/`,
    languages: { en: `${ORIGIN}/changelog/`, fr: `${ORIGIN}/fr/changelog/`, "x-default": `${ORIGIN}/changelog/` },
    types: { "application/rss+xml": "/changelog/feed.xml" },
  },
};

export default function Page() {
  return <ChangelogRoute locale="fr" />;
}
