import { notFound } from "next/navigation";

import { MomentsConsole } from "@/components/console/MomentsConsole";
import { pageMember } from "@/lib/auth";

/** The organisation's view of the moments: counts and durations, the lines to call shown, lines kept — no words, no names. Organisers only. */
export default async function AdminMomentsPage() {
  const member = await pageMember();
  if (member?.role !== "ADMIN") notFound();
  return <MomentsConsole />;
}
