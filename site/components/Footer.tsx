"use client";

import { SiteFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { getMessages, type Locale, type Messages } from "@/lib/messages";

/* The footer is @krizaka/ui's SiteFooter in product mode (family={false}): this site's own column (the crisis lines,
   always one tap away), the publisher line "A Krizaka product", DEV · the version, Montréal. No family columns. The dev-environment line ends the signature row (no strip under the
   footer). */
export function Footer({ locale, m, crisis, version, ui, devNotice }: { locale: Locale; m: Messages["footer"]; crisis: Messages["crisis"]; version: string; ui: string; devNotice?: string }) {
  return (
    <SiteFooter
      current="yororis"
      family={false}
      labels={familyLabels[locale]}
      aria-label={m.nav}
      env="dev"
      version={version}
      legal={devNotice ? <span data-testid="dev-environment-notice">{devNotice}</span> : undefined}
    >
      <SiteFooter.Column title={crisis.label}>
        <SiteFooter.Link href="tel:988">9-8-8</SiteFooter.Link>
        <SiteFooter.Link href="tel:811">{crisis.quebecName}</SiteFooter.Link>
      </SiteFooter.Column>
      <SiteFooter.Column title={getMessages(locale).changelogPage.eyebrow}>
        <SiteFooter.Link href={`${locale === "en" ? "" : "/fr"}/changelog/#${version}`}>
          {getMessages(locale).changelogPage.footerVersion.replace("{version}", version)}
          {ui ? ` · Krizaka UI ${ui}` : ""}
        </SiteFooter.Link>
      </SiteFooter.Column>
    </SiteFooter>
  );
}
