import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeScript } from "@krizaka/ui/theme";
import { SkipLink } from "@krizaka/ui/skip-link";
import { cn } from "@krizaka/ui/cn";
import { displayFace, monoFace, textFace } from "@/lib/fonts";
import { getMessages, homePath, type Locale } from "@/lib/messages";
import { siteJsonLd } from "@/lib/jsonld";
import { indexable } from "@/lib/indexing";
import { ORIGIN } from "@/lib/site";
import { Bar } from "./Bar";
import { version } from "@/lib/version";
import { Footer } from "./Footer";
import { Providers } from "./Providers";

export function metadataFor(locale: Locale): Metadata {
  const m = getMessages(locale);
  const other: Locale = locale === "en" ? "fr" : "en";
  const url = `${ORIGIN}${homePath(locale)}`;
  return {
    ...(indexable() ? {} : { robots: { index: false, follow: false, noarchive: true } }),
    metadataBase: new URL(ORIGIN),
    title: m.meta.title,
    description: m.meta.description,
    alternates: { canonical: url, languages: { en: `${ORIGIN}/`, fr: `${ORIGIN}/fr/`, "x-default": `${ORIGIN}/` } },
    openGraph: {
      type: "website",
      siteName: "Yororis",
      title: m.meta.title,
      description: m.meta.description,
      url,
      locale: locale === "en" ? "en_CA" : "fr_CA",
      alternateLocale: other === "en" ? "en_CA" : "fr_CA",
      images: [{ url: `${ORIGIN}/og.png`, width: 1200, height: 630, alt: m.meta.ogAlt }],
    },
    twitter: { card: "summary_large_image", title: m.meta.title, description: m.meta.description, images: [`${ORIGIN}/og.png`] },
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  };
}

/** The document of both languages (two root layouts: en at /, fr at /fr/): fonts, brand, theme, bar, footer. */
export function Shell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const m = getMessages(locale);
  return (
    <html lang={locale} className={cn(textFace.variable, displayFace.variable, monoFace.variable)} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript defaultMode="system" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(locale, m.meta.title, m.meta.description)) }} />
      </head>
      <body className="brand-yororis">
        <Providers>
          <SkipLink href="#main">{m.bar.skip}</SkipLink>
          <Bar m={m.bar} locale={locale} version={version()} home={homePath(locale)} otherHref={m.otherHref} otherLabel={m.otherLabel} other={m.other} />
          {children}
          <Footer locale={locale} m={m.footer} crisis={m.crisis} version={version()} devNotice={indexable() ? undefined : m.footer.devNotice} />
        </Providers>
      </body>
    </html>
  );
}
