import { ChatIcon, KeepIcon, MomentIcon, ShieldIcon, ThreadIcon } from "@krizaka/icons";
import { YororisLogo } from "@krizaka/ui";
import { ActionBar } from "@krizaka/ui/action-bar";
import { ArgumentCard } from "@krizaka/ui/argument-card";
import { Badge } from "@krizaka/ui/badge";
import { Button } from "@krizaka/ui/button";
import { CardGrid } from "@krizaka/ui/card-grid";
import { CtaPanel } from "@krizaka/ui/cta-panel";
import { DecisionList } from "@krizaka/ui/decision-list";
import { LinkCard } from "@krizaka/ui/link-card";
import { MascotQuote } from "@krizaka/ui/mascot-quote";
import { MetaRow } from "@krizaka/ui/meta-row";
import { Facts, Section, Ticks } from "@krizaka/ui/page";
import { PageHero } from "@krizaka/ui/page-hero";
import { getMessages, type Locale } from "@/lib/messages";
import { reveal } from "@/lib/motion";
import { ADR_051, ADR_055, CONTACT, FRAMEWORK, REPO, SHOTS } from "@/lib/site";
import CHANGELOG from "@/lib/changelog.generated.json";

import { Crisis } from "./Crisis";
import { GitHubMark } from "./GitHubMark";

/* The one page of Yororis, built from the page blocks of @krizaka/ui (language of krizaka.com): the idea, how it is built
   in the open, what it is not, the crisis lines, and one call to action. Construction mode (docs/FRAMEWORK.md §5): no demo,
   no download, no form, no date, no promise of availability — the one action is "Talk to us about Yororis".
   The hero and the crisis line are painted at once (no reveal: LCP); the sections arrive once as they enter the view. */
const CARDS = [
  { id: "presence", Icon: ChatIcon },
  { id: "moment", Icon: MomentIcon },
  { id: "keep", Icon: KeepIcon },
] as const;

const LINKS = [
  { id: "repo", href: REPO, icon: <GitHubMark size={18} /> },
  { id: "framework", href: FRAMEWORK, icon: <ThreadIcon size={20} aria-hidden /> },
  { id: "adr", href: ADR_055, icon: <ShieldIcon size={20} aria-hidden /> },
  { id: "sensitive", href: ADR_051, icon: <ShieldIcon size={20} aria-hidden /> },
] as const;

const DECISION_LABELS = {
  en: { chose: "Chose", refused: "Refused", because: "Because", cost: "What it costs" },
  fr: { chose: "Choisi", refused: "Refusé", because: "Parce que", cost: "Ce que ça coûte" },
} as const;

export function Home({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  return (
    <main id="main" className="yo-main">
      <PageHero
        eyebrow={
          <>
            <YororisLogo size={18} animated={false} /> {m.hero.eyebrow}
          </>
        }
        title={m.hero.title}
        lead={m.hero.lead}
        aside={<YororisLogo size={176} className="yo-hero-mark" />}
      >
        <div className="rd-stack">
          <Facts aria-label={m.hero.factsLabel} items={[{ label: m.hero.facts.status, tone: "wip" }, { label: m.hero.facts.open }, { label: m.hero.facts.date }]} />
          <p className="rd-prose yo-status">{m.reviewed.construction}</p>
          <div className="rd-links">
            <Button asChild variant="secondary" size="lg" shape="cut">
              <a href="#how">{m.hero.explore}</a>
            </Button>
          </div>
          <div aria-label={m.crisis.aria} role="group">
            <Crisis m={m.crisis} />
          </div>
        </div>
      </PageHero>

      <Section id="what" eyebrow={m.what.eyebrow} title={m.what.title} lead={m.what.lead} headingSize="sm" spacing="sm">
        <div className="rd-stack">
          <CardGrid columns={3} min={260} reveal>
            {CARDS.map(({ id, Icon }) => {
              const c = m.what.cards[id];
              return (
                <ArgumentCard
                  key={id}
                  id={`what-${id}`}
                  icon={<Icon size={22} aria-hidden />}
                  title={c.title}
                  meta={c.meta}
                  hook={{ label: m.what.label, text: c.hook }}
                  points={{ label: m.what.instead, items: c.items }}
                  panelLabel={m.what.expand}
                />
              );
            })}
          </CardGrid>
          <h3 className="rd-h3" {...reveal()}>
            {m.what.stops.title}
          </h3>
          <p className="rd-prose" {...reveal()}>
            {m.what.stops.lead}
          </p>
          <DecisionList
            reveal
            labels={DECISION_LABELS[locale]}
            decisions={m.what.stops.decisions.map((d) => ({ id: d.chose, chose: <Ticks>{d.chose}</Ticks>, refused: <Ticks>{d.refused}</Ticks>, because: <Ticks>{d.because}</Ticks>, cost: <Ticks>{d.cost}</Ticks> }))}
          />
        </div>
      </Section>

      <Section id="how" eyebrow={m.how.eyebrow} title={m.how.title} lead={m.how.lead} headingSize="sm" divider>
        <div className="rd-stack">
          <div className="rd-two">
            <div className="rd-stack" {...reveal()}>
              <h3 className="rd-h3">{m.how.study.title}</h3>
              <p className="rd-prose is-small">{m.how.study.lead}</p>
              <ul className="kz-list">
                {m.how.study.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="rd-stack" {...reveal(1)}>
              <h3 className="rd-h3">{m.how.guards.title}</h3>
              <p className="rd-prose is-small">{m.how.guards.lead}</p>
              <ul className="kz-list">
                {m.how.guards.items.map((line) => (
                  <li key={line}>
                    <Ticks>{line}</Ticks>
                  </li>
                ))}
              </ul>
              <h3 className="rd-h3">{m.how.own.title}</h3>
              <ul className="kz-list">
                {m.how.own.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div {...reveal()}>
            <MascotQuote bird="crane" mood="thinking" label={m.how.crane}>
              {m.how.rule}
            </MascotQuote>
          </div>
          <div className="rd-stack" {...reveal()}>
            <h3 className="rd-h3">{m.how.app.title}</h3>
            <p className="rd-prose is-small">{m.how.app.lead}</p>
            <p className="yo-shot-status" role="note">
              {m.how.app.status}
            </p>
            <ul className="yo-shots">
              {SHOTS.map(({ id, desktop, phone }) => (
                <li key={id} className="yo-shot">
                  <figure>
                    <img className="yo-shot-desktop" src={desktop.src} width={desktop.width} height={desktop.height} alt={m.how.app.shots[id].alt} loading="lazy" decoding="async" />
                    <figcaption>
                      {m.how.app.shots[id].label} · {m.how.app.desktop}
                    </figcaption>
                  </figure>
                  <figure>
                    <img className="yo-shot-phone" src={phone.src} width={phone.width} height={phone.height} alt={m.how.app.shots[id].alt} loading="lazy" decoding="async" />
                    <figcaption>{m.how.app.phone}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            <p className="rd-prose is-small">{m.how.app.note}</p>
          </div>
          <div className="rd-stack" {...reveal()}>
            <h3 className="rd-h3">{m.changelog.label}</h3>
            <p className="rd-prose is-small">{m.changelog.lead}</p>
            {CHANGELOG.entries.length ? (
              <ol className="yo-changelog">
                {CHANGELOG.entries.map((e) => (
                  <li key={e.number}>
                    <time dateTime={e.mergedAt}>{new Date(e.mergedAt).toLocaleDateString(m.dateLocale, { day: "numeric", month: "short", timeZone: "UTC" })}</time>
                    <span>{e.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="yo-changelog-empty">{m.changelog.empty}</p>
            )}
          </div>
        </div>
      </Section>

      <Section id="not" title={m.not.title} headingSize="sm" divider>
        <div className="rd-two">
          <div className="rd-stack" {...reveal()}>
            <p className="rd-prose">{m.not.lead}</p>
            <ul className="kz-list rd-no">
              {m.reviewed.isNot.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="rd-stack" {...reveal(1)}>
            <MascotQuote variant="callout" bird="falcon" mood="thinking" label={m.not.falcon}>
              {m.reviewed.isNotRule}
            </MascotQuote>
            <Crisis m={m.crisis} />
          </div>
        </div>
        <div className="rd-stack mt-10">
          <h3 className="rd-h3" {...reveal()}>
            {m.how.open.title}
          </h3>
          <CardGrid as="ul" columns={2} min={260} reveal>
            {LINKS.map(({ id, href, icon }) => (
              <LinkCard key={id} href={href} icon={icon} title={m.how.open.links[id].name} titleAs="span" description={m.how.open.links[id].line} target="_blank" rel="noopener noreferrer" />
            ))}
          </CardGrid>
          <MetaRow className="mt-2" size="md" items={[m.not.powered, m.hero.facts.open]} chips={[<Badge key="status" tone="warning">{m.hero.facts.status}</Badge>]} />
        </div>
      </Section>

      <Section spacing="sm" aria-labelledby="talk-title">
        <CtaPanel id="talk-title" title={m.cta.title} body={m.cta.body} reveal>
          <Button asChild variant="primary" size="lg" shape="cut">
            <a href={CONTACT}>{m.cta.title}</a>
          </Button>
                  </CtaPanel>
      </Section>
    </main>
  );
}
