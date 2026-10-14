import { Timeline } from "@krizaka/ui/activity-feed";
import { Badge } from "@krizaka/ui/badge";
import { Card } from "@krizaka/ui/card";
import { DescriptionList } from "@krizaka/ui/description-list";
import { DetailLayout } from "@krizaka/ui/detail-layout";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MemberActions } from "@/components/console/MemberActions";
import { pageMember } from "@/lib/auth";
import { isUuid } from "@/lib/http";
import { asLocale, getDictionary } from "@/lib/i18n";
import { auditFor, findById } from "@/lib/store";

/** One member for an organiser: who they are and whether they have access — never what they say or keep. */
export default async function MemberPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale = asLocale(raw);
  const me = await pageMember();
  if (me?.role !== "ADMIN" || !isUuid(id)) notFound();
  const m = findById(id);
  if (!m) notFound();
  const d = getDictionary(locale).console.admin;
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const lines = auditFor(id);
  return (
    <DetailLayout
      back={<Link href={`/${locale}/admin/members`}>{d.member.back}</Link>}
      eyebrow={d.member.eyebrow}
      title={m.name}
      status={
        <Badge tone={m.status === "ACTIVE" ? "success" : "neutral"} dot>
          {d.statuses[m.status]}
        </Badge>
      }
      meta={m.status === "PAUSED" ? d.member.paused : m.email}
      actions={<MemberActions id={m.id} status={m.status} role={m.role} />}
      aside={
        <Card.Root>
          <Card.Body>
            <Card.Title as="h3">{d.member.facts}</Card.Title>
            <DescriptionList
              layout="inline"
              items={[
                { term: d.member.id, details: <span className="break-all font-mono text-xs">{m.id}</span> },
                { term: d.member.email, details: m.email },
                { term: d.member.organisation, details: m.organisation },
                { term: d.member.role, details: d.roles[m.role] },
                { term: d.member.language, details: m.locale.toUpperCase() },
                { term: d.member.joined, details: when.format(new Date(m.createdAt)) },
                { term: d.member.lastSeen, details: m.lastSeenAt ? when.format(new Date(m.lastSeenAt)) : d.members.never },
              ]}
            />
          </Card.Body>
        </Card.Root>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-secondary">{d.member.limitsNote}</p>
        <h2 className="font-display text-lg font-bold text-fg">{d.member.activityTitle}</h2>
        {lines.length ? (
          <Timeline
            aria-label={d.member.activityLabel}
            locale={locale}
            timeStyle="datetime"
            events={lines.map((l) => ({ id: l.id, at: l.at, title: d.member.actions[l.action], description: l.actor, tone: l.action === "sign_in_refused" || l.action === "paused" ? ("danger" as const) : undefined }))}
          />
        ) : (
          <p className="text-sm text-fg-secondary">{d.member.activityEmpty}</p>
        )}
      </div>
    </DetailLayout>
  );
}
