import { format } from "@krizaka/i18n";
import Link from "next/link";

import { asLocale, getDictionary } from "@/lib/i18n";
import { TERMS_VERSION } from "@/lib/terms";

/** The terms of use an invited tester agrees to, in plain words. Public to read (the consent page links here). */
export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale).console.terms;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 text-fg">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="text-sm text-fg-secondary">{format(t.version, { version: TERMS_VERSION })}</p>
      <ul className="flex list-disc flex-col gap-3 pl-5 marker:text-fg-accent">
        {t.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Link className="font-semibold text-fg-accent" href={`/${locale}/sign-in`}>
        {t.back}
      </Link>
    </main>
  );
}
