"use client";

import { SiteFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import type { Locale, Messages } from "@/lib/messages";

/* The footer is @krizaka/ui's SiteFooter in product mode (family={false}): this site's own column (the crisis lines,
   always one tap away), the publisher line "A Krizaka product", DEV · the version, Montréal. No family columns. */
export function Footer({ locale, m, crisis, version, devNotice }: { locale: Locale; m: Messages["footer"]; crisis: Messages["crisis"]; version: string; devNotice?: string }) {
  return (
    <>
    <SiteFooter current="yororis" family={false} labels={familyLabels[locale]} aria-label={m.nav} version={version} env="dev">
      <SiteFooter.Column title={crisis.label}>
        <SiteFooter.Link href="tel:988">9-8-8</SiteFooter.Link>
        <SiteFooter.Link href="tel:811">{crisis.quebecName}</SiteFooter.Link>
      </SiteFooter.Column>
    </SiteFooter>
    {devNotice ? (
      <p className="mx-auto max-w-6xl px-4 pb-6 text-center text-xs text-fg-muted" data-testid="dev-environment-notice">
        {devNotice}
      </p>
    ) : null}
    </>
  );
}
