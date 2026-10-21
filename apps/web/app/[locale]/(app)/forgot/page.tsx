import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/console/AuthFrame";
import { ForgotForm } from "@/components/console/ForgotForm";
import { pageMember } from "@/lib/auth";
import { asLocale, getDictionary } from "@/lib/i18n";

/** Asks for a link to choose a new password (the account's address; the answer is the same whatever it is). */
export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  if (await pageMember()) redirect(`/${locale}/account`);
  const t = getDictionary(locale).console.forgot;
  return (
    <AuthFrame locale={locale} title={t.title} description={t.description}>
      <div className="flex flex-col gap-4">
        <ForgotForm />
        <Link className="text-sm font-semibold text-fg-accent" href={`/${locale}/sign-in`}>
          {t.back}
        </Link>
      </div>
    </AuthFrame>
  );
}
