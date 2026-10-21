import Link from "next/link";

import { AuthFrame } from "@/components/console/AuthFrame";
import { ResetForm } from "@/components/console/ResetForm";
import { asLocale, getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Chooses a new password from the e-mailed link (`?token=`). Nothing about the link is checked before the form is sent. */
export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const locale = asLocale((await params).locale);
  const token = (await searchParams).token ?? "";
  const t = getDictionary(locale).console.reset;
  return (
    <AuthFrame locale={locale} title={t.title} description={t.description}>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-secondary">{t.invalid}</p>
          <Link className="font-semibold text-fg-accent" href={`/${locale}/forgot`}>
            {t.askAgain}
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
