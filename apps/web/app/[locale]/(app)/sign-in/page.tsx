import { YororisLogo } from "@krizaka/ui";
import { AuthLayout } from "@krizaka/ui/auth-layout";
import { Mascot } from "@krizaka/ui/mascots";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/console/SignInForm";
import { pageMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { asLocale, getDictionary } from "@/lib/i18n";

/** Sign-in on the product's auth template. It says what this is — in development, not available — and offers one door: talk to us. */
export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  if (await pageMember()) redirect(`/${locale}`);
  const t = getDictionary(locale).console.signIn;
  return (
    <AuthLayout
      brand={
        <>
          <YororisLogo size={28} /> Yororis
        </>
      }
      promise={t.promise}
      aside={<Mascot bird="crane" mood="welcome" size={72} />}
      asideFooter={t.asideFooter}
      title={t.title}
      description={t.description}
      footer={
        <>
          <strong className="block font-semibold text-fg">{t.noticeTitle}</strong>
          <span className="block">{t.notice}</span>{" "}
          <a className="font-semibold text-fg-accent" href="https://www.krizaka.com/contact?topic=yororis">
            {t.contact}
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SignInForm next={`/${locale}`} />
        {dbConfigured() ? (
          <Link className="text-sm font-semibold text-fg-accent" href={`/${locale}/forgot`}>
            {t.forgot}
          </Link>
        ) : null}
      </div>
    </AuthLayout>
  );
}
