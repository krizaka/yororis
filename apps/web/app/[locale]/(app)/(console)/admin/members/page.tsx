import { PageHeader } from "@krizaka/ui/page-header";
import { notFound } from "next/navigation";

import { MembersTable } from "@/components/console/MembersTable";
import { pageMember } from "@/lib/auth";
import { asLocale, getDictionary } from "@/lib/i18n";

/** The organisation's members, a server-mode table. Not an organiser: a 404. */
export default async function MembersPage({ params }: { params: Promise<{ locale: string }> }) {
  const m = await pageMember();
  if (m?.role !== "ADMIN") notFound();
  const t = getDictionary(asLocale((await params).locale)).console.admin.members;
  return (
    <>
      <PageHeader as="h2" title={t.title} description={t.description} className="mb-6" />
      <MembersTable />
    </>
  );
}
