import { StoryIcon } from "@krizaka/icons";
import { buttonVariants } from "@krizaka/ui/button";
import { DashboardLayout, Widget } from "@krizaka/ui/dashboard-layout";
import { EmptyState } from "@krizaka/ui/empty-state";

import { ButtonLink } from "@/components/console/ButtonLink";
import { pageMember } from "@/lib/auth";
import { asLocale, getDictionary } from "@/lib/i18n";

const placeholders = ["moments", "keep", "thread", "notebook"] as const;

/**
 * A calm personal home: the presence that stops (the organisation's limits, defaults), then what the person owns — their
 * moments, what I keep, the thread, my notebook — each a designed empty state, because nothing is available. And the
 * lines to call, always one press away.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const member = await pageMember();
  const d = getDictionary(locale).console.dashboard;
  const first = member?.name.split(" ")[0] ?? "";
  return (
    <DashboardLayout headingAs="h2" title={d.greeting.replace("{name}", first)} description={d.lead}>
      <Widget level={3} title={d.beginTitle} description={d.begin} span="full">
        <ButtonLink href={`/${locale}/moment`} variant="primary" size="md" shape="cut">
          {d.beginAction}
        </ButtonLink>
      </Widget>
      <Widget level={3} title={d.stopsTitle} description={d.stopsDescription} span={2}>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {(
            [
              [d.lengthLabel, d.length],
              [d.perDayLabel, d.perDay],
              [d.perWeekLabel, d.perWeek],
            ] as const
          ).map(([term, value]) => (
            <div key={term} className="rounded-lg border border-border-default bg-surface-1 p-3">
              <dt className="text-fg-muted">{term}</dt>
              <dd className="mt-1 font-display text-lg font-extrabold text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </Widget>
      <Widget level={3} title={d.crisisTitle} description={d.crisisText} span={2}>
        <div className="flex flex-wrap gap-2">
          <a className={buttonVariants({ variant: "primary", size: "sm", shape: "cut" })} href="tel:988">
            {d.call}
          </a>
          <a className={buttonVariants({ variant: "secondary", size: "sm", shape: "cut" })} href="sms:988">
            {d.text}
          </a>
          <a className={buttonVariants({ variant: "secondary", size: "sm", shape: "cut" })} href="tel:811">
            {d.infoSocial}
          </a>
        </div>
      </Widget>
      {placeholders.map((id) => (
        <Widget key={id} level={3} title={d[`${id}Title`]} description={d[`${id}Description` as keyof typeof d] as string} span={2}>
          <EmptyState icon={<StoryIcon />} title={d[`${id}EmptyTitle` as keyof typeof d] as string} description={d[(id === "moments" ? "momentsEmpty" : `${id}Empty`) as keyof typeof d] as string} />
        </Widget>
      ))}
    </DashboardLayout>
  );
}
