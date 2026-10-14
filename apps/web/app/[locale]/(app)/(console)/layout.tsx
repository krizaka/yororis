import { redirect } from "next/navigation";

import { ConsoleShell } from "@/components/console/ConsoleShell";
import { pageMember } from "@/lib/auth";
import { asLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** The signed-in space: no cookie, no page. The organisation's group only for an organiser. */
export default async function ConsoleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const member = await pageMember();
  if (!member) redirect(`/${locale}/sign-in`);
  return (
    <ConsoleShell locale={locale} email={member.email} organiser={member.role === "ADMIN"}>
      {children}
    </ConsoleShell>
  );
}
