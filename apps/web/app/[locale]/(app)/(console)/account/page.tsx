import { notFound } from "next/navigation";

import { AccountView } from "@/components/console/AccountView";
import { pageMember } from "@/lib/auth";

/** The member's account: profile, display choices, consent, what to bring, deletion — their own record only. */
export default async function AccountPage() {
  const m = await pageMember();
  if (!m) notFound();
  return <AccountView account={{ email: m.email, organisation: m.organisation, locale: m.locale, name: m.name, subtitles: m.subtitles, calmMotion: m.calmMotion }} />;
}
