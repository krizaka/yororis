import type { Metadata } from "next";

import { ChangelogRoute } from "@/components/ChangelogPage";
import { changelogMetadata } from "@/components/changelog-metadata";

export const metadata: Metadata = changelogMetadata("fr");

export default function Page() {
  return <ChangelogRoute locale="fr" />;
}
