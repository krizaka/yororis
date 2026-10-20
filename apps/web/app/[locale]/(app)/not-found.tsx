"use client";

import { ErrorPage } from "@krizaka/ui/error-page";
import { Mascot } from "@krizaka/ui/mascots";

import { ButtonLink } from "@/components/console/ButtonLink";
import { useI18n } from "@/lib/i18n-client";

/**
 * Any page of the member space that answers 404 (an organiser's page asked by a member, an unknown member): written in the
 * HTML the server sends. Without this file Next paints its own 404 with scripts after the load event, so a slow phone or runner
 * first shows an empty page.
 */
export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <ErrorPage
        code={t("console.notFound.code")}
        mascot={<Mascot bird="crane" mood="empty" size={72} />}
        title={t("console.notFound.title")}
        text={t("console.notFound.text")}
        actions={<ButtonLink href={`/${locale}`}>{t("console.notFound.home")}</ButtonLink>}
      />
    </main>
  );
}
