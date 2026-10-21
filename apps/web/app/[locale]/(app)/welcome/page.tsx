import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/console/AuthFrame";
import { ConsentForm } from "@/components/console/ConsentForm";
import { pageMember } from "@/lib/auth";
import { asLocale, getDictionary } from "@/lib/i18n";

/** The first sign-in: 18 or older, and the terms. A member who already agreed goes straight in; nobody signed out sees it. */
export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const member = await pageMember();
  if (!member) redirect(`/${locale}/sign-in`);
  if (member.consented !== false) redirect(`/${locale}`);
  const t = getDictionary(locale).console.welcome;
  return (
    <AuthFrame locale={locale} title={t.title} description={t.description}>
      <ConsentForm />
    </AuthFrame>
  );
}
