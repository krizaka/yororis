import { YororisLogo } from "@krizaka/ui";
import { AuthLayout } from "@krizaka/ui/auth-layout";
import { Mascot } from "@krizaka/ui/mascots";

import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

/** The product's auth template around one door of the signed-out space (forgot, reset): the same brand, promise and notice as sign-in. */
export function AuthFrame({ locale, title, description, children }: { locale: Locale; title: string; description: string; children: React.ReactNode }) {
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
      title={title}
      description={description}
      footer={
        <>
          <strong className="block font-semibold text-fg">{t.noticeTitle}</strong>
          <span className="block">{t.notice}</span>
        </>
      }
    >
      {children}
    </AuthLayout>
  );
}
