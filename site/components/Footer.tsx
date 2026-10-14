"use client";

import { SiteFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import type { Locale, Messages } from "@/lib/messages";

/* The footer of the family (NAV-SYS) is @krizaka/ui's SiteFooter: this site's own column (the crisis lines, always one
   tap away), the family in columns, "A Krizaka product", DEV · the version, Montréal. */
export function Footer({ locale, m, crisis, version }: { locale: Locale; m: Messages["footer"]; crisis: Messages["crisis"]; version: string }) {
  return (
    <SiteFooter current="yororis" labels={familyLabels[locale]} aria-label={m.nav} version={version} env="dev">
      <SiteFooter.Column title={crisis.label}>
        <SiteFooter.Link href="tel:988">9-8-8</SiteFooter.Link>
        <SiteFooter.Link href="tel:811">{crisis.quebecName}</SiteFooter.Link>
      </SiteFooter.Column>
    </SiteFooter>
  );
}
