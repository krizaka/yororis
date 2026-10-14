import { ConsoleProviders } from "@/components/console/ConsoleProviders";
import { asLocale, getDictionary } from "@/lib/i18n";

/** What the console and its sign-in page share: the language slice and the query client. */
export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  return (
    <ConsoleProviders locale={locale} messages={{ console: getDictionary(locale).console }}>
      {children}
    </ConsoleProviders>
  );
}
