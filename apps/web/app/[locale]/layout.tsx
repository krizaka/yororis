import "../globals.css";
import "@krizaka/ui/blocks.css";

import { cn } from "@krizaka/ui/cn";
import { ThemeProvider, ThemeScript } from "@krizaka/ui/theme";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { displayFace, monoFace, textFace } from "@/lib/fonts";
import { getDictionary, type Locale, LOCALES } from "@/lib/i18n";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(LOCALES.includes(locale as Locale) ? (locale as Locale) : "en").console.meta.siteName, robots: { index: false, follow: false } };
}

/** The root of the member space, in the language of the address, in the reader's theme, under the Yororis brand. */
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  return (
    <html lang={locale} className={cn("brand-yororis", textFace.variable, displayFace.variable, monoFace.variable)} suppressHydrationWarning>
      <head>
        <ThemeScript defaultMode="system" />
      </head>
      <body className="min-h-screen bg-surface-0 text-fg antialiased selection:bg-accent selection:text-on-accent">
        <ThemeProvider defaultMode="system">{children}</ThemeProvider>
      </body>
    </html>
  );
}
