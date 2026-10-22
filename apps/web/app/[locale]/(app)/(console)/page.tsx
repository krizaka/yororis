import { StoryIcon } from "@krizaka/icons";
import { buttonVariants } from "@krizaka/ui/button";
import { DashboardLayout, Widget } from "@krizaka/ui/dashboard-layout";
import { EmptyState } from "@krizaka/ui/empty-state";

import { ButtonLink } from "@/components/console/ButtonLink";
import { NeighbourCard } from "@/components/console/NeighbourCard";
import { pageMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { asLocale, getDictionary } from "@/lib/i18n";
import { currentNow } from "@/lib/neighbours";

const placeholders = ["moments"] as const;

/**
 * A calm personal home: the presence that stops (the organisation's limits, defaults), then what the person owns — their
 * moments — a designed empty state, because nothing is available (nothing is kept). And the
 * lines to call, always one press away.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const member = await pageMember();
  const d = getDictionary(locale).console.dashboard;
  const first = member?.name.split(" ")[0] ?? "";
  const c = member && dbConfigured() ? await currentNow(member.id) : null;
  return (
    <DashboardLayout headingAs="h2" title={d.greeting.replace("{name}", first)} description={d.lead}>
      <Widget level={3} title={d.beginTitle} description={d.begin} span="full">
        <ButtonLink href={`/${locale}/moment`} variant="primary" size="md">
          {d.beginAction}
        </ButtonLink>
      </Widget>
      {c ? (
        <Widget level={3} title={d.neighbour.title} span={2}>
          <NeighbourCard name={c.neighbour.name} line={c.neighbour.line[locale]} moved={c.moved ? { from: c.moved.from.name, to: c.moved.to.name } : null} />
        </Widget>
      ) : null}
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
          <a className={buttonVariants({ variant: "primary", size: "sm" })} href="tel:988">
            {d.call}
          </a>
          <a className={buttonVariants({ variant: "secondary", size: "sm" })} href="sms:988">
            {d.text}
          </a>
          <a className={buttonVariants({ variant: "secondary", size: "sm" })} href="tel:811">
            {d.infoSocial}
          </a>
        </div>
      </Widget>
      {placeholders.map((id) => (
        <Widget key={id} level={3} title={d[`${id}Title`]} description={d[`${id}Description` as keyof typeof d] as string} span={2}>
          <EmptyState icon={<StoryIcon />} title={d[`${id}EmptyTitle` as keyof typeof d] as string} description={d[("momentsEmpty") as keyof typeof d] as string} />
        </Widget>
      ))}
    </DashboardLayout>
  );
}
