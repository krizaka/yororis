import { ForwardIcon, KeepIcon, MessageIcon, ShieldIcon, SoundIcon, ThreadIcon, UserIcon } from "@krizaka/icons";
import { YororisLogo } from "@krizaka/ui";
import { ActionBar } from "@krizaka/ui/action-bar";
import { Badge } from "@krizaka/ui/badge";
import { Button } from "@krizaka/ui/button";
import { CardGrid } from "@krizaka/ui/card-grid";
import { DecisionList } from "@krizaka/ui/decision-list";
import { LinkCard } from "@krizaka/ui/link-card";
import { MascotQuote } from "@krizaka/ui/mascot-quote";
import { MetaRow } from "@krizaka/ui/meta-row";
import { Facts, Section, Ticks } from "@krizaka/ui/page";
import { LandingPage } from "@krizaka/ui/landing-page";
import { Stepper } from "@krizaka/ui/stepper";
import { getMessages, type Locale } from "@/lib/messages";
import { reveal } from "@/lib/motion";
import { ADR_051, ADR_055, CONTACT, FRAMEWORK, REPO, SHOTS } from "@/lib/site";
import CHANGELOG from "@/lib/changelog.generated.json";

import { AppTour } from "./AppTour";
import { Crisis } from "./Crisis";
import { MomentTake } from "./MomentTake";
import { GitHubMark } from "./GitHubMark";

/* The one page of Yororis, on the LandingPage template of @krizaka/ui (language of krizaka.com): the idea, how it is built
   in the open, what it is not, the crisis lines, and one call to action. Construction mode (docs/FRAMEWORK.md §5): no demo,
   no download, no form, no date, no promise of availability — the one action is "Talk to us about Yororis".
   The hero and the crisis line are painted at once (no reveal: LCP); the sections arrive once as they enter the view. */
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

const FEATURE_ICONS = [<UserIcon key="face" />, <SoundIcon key="voice" />, <MessageIcon key="question" />, <KeepIcon key="keep" />] as const;
const FEATURE_SIZES = ["lg", "md", "sm", "sm"] as const;

export function Home({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  return (
    <main id="main" className="yo-main">
      <LandingPage
        eyebrow={
          <>
            <YororisLogo size={18} animated={false} /> {m.hero.eyebrow}
          </>
        }
        title={m.hero.title}
        lead={m.hero.lead}
        visualLabel={m.hero.take.label}
        visual={<MomentTake m={m.hero.take} />}
        actions={
          <div className="rd-stack yo-hero-stack">
            <div aria-label={m.crisis.aria} role="group">
              <Crisis m={m.crisis} />
            </div>
            <div className="rd-links">
              <Button asChild variant="primary" size="lg" shape="cut" shimmer>
                <a href={CONTACT}>
                  {m.hero.talk} <ForwardIcon size={16} strokeWidth={2.25} />
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg" shape="cut">
                <a href="#what">{m.hero.explore}</a>
              </Button>
            </div>
            <Facts aria-label={m.hero.factsLabel} items={[{ label: m.hero.facts.status, tone: "wip" }, { label: m.hero.facts.open }, { label: m.hero.facts.date }]} />
            <p className="rd-prose yo-status">{m.reviewed.construction}</p>
          </div>
        }
        featuresHeading={{ eyebrow: m.features.eyebrow, title: m.features.title }}
        features={m.features.items.map((f, i) => ({ id: `f${i}`, size: FEATURE_SIZES[i], icon: FEATURE_ICONS[i], title: f.title, text: f.text }))}
        closing={{
          title: m.cta.title,
          body: m.cta.body,
          actions: (
            <Button asChild variant="primary" size="lg" shape="cut">
              <a href={CONTACT}>{m.cta.title}</a>
            </Button>
          ),
        }}
      >
      <Section id="what" eyebrow={m.what.eyebrow} title={m.what.title} lead={m.what.lead} headingSize="sm" spacing="sm">
        <div className="rd-stack">
          <p className="yo-shot-status" role="note" {...reveal()}>
            {m.what.status} · {m.what.statusNote}
          </p>
          <div {...reveal(1)}>
            <Stepper
              aria-label={m.what.title}
              current={-1}
              labels={m.what.labels}
              steps={m.what.steps.map((step) => ({ title: step.title, description: step.text, status: "upcoming" as const }))}
            />
          </div>
        </div>
      </Section>

      <Section id="not" title={m.not.title} lead={m.not.lead} headingSize="sm" divider>
        <div className="rd-stack">
          <div className="rd-two">
            <div className="rd-stack" {...reveal()}>
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
          <h3 className="rd-h3" {...reveal()}>
            {m.not.stops.title}
          </h3>
          <p className="rd-prose" {...reveal()}>
            {m.not.stops.lead}
          </p>
          <DecisionList
            reveal
            labels={DECISION_LABELS[locale]}
            decisions={m.not.stops.decisions.map((d) => ({ id: d.chose, chose: <Ticks>{d.chose}</Ticks>, refused: <Ticks>{d.refused}</Ticks>, because: <Ticks>{d.because}</Ticks>, cost: <Ticks>{d.cost}</Ticks> }))}
          />
          <h3 className="rd-h3" id="private" {...reveal()}>
            {m.not.privacy.title}
          </h3>
          <p className="rd-prose is-small" {...reveal()}>
            {m.not.privacy.lead}
          </p>
          <CardGrid as="ul" columns={3} min={240} reveal>
            {m.not.privacy.items.map((item) => (
              <li key={item.q} className="yo-keep">
                <p className="yo-keep-q">{item.q}</p>
                <p className="rd-prose is-small">{item.a}</p>
              </li>
            ))}
          </CardGrid>
        </div>
      </Section>

      <Section id="how" eyebrow={m.how.eyebrow} title={m.how.title} lead={m.how.lead} headingSize="sm" divider>
        <div className="rd-stack">
          <div className="rd-two">
            <div className="rd-stack" {...reveal()}>
              <h3 className="rd-h3">{m.how.guards.title}</h3>
              <p className="rd-prose is-small">{m.how.guards.lead}</p>
              <ul className="kz-list">
                {m.how.guards.items.map((line) => (
                  <li key={line}>
                    <Ticks>{line}</Ticks>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rd-stack" {...reveal(1)}>
              <h3 className="rd-h3">{m.how.own.title}</h3>
              <ul className="kz-list">
                {m.how.own.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <h3 className="rd-h3">{m.how.study.title}</h3>
              <p className="rd-prose is-small">{m.how.study.lead}</p>
              <ul className="kz-list">
                {m.how.study.items.map((line) => (
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
            <div className="yo-shots">
              <AppTour
                player={m.how.app.player}
                steps={SHOTS.map(({ id, phone }) => ({ id, title: m.how.app.shots[id].label, description: m.how.app.shots[id].line, poster: phone.src, alt: m.how.app.shots[id].alt }))}
              />
            </div>
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

      </LandingPage>
    </main>
  );
}
