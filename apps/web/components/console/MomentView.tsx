"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { Avatar } from "@krizaka/ui/avatar";
import { Badge } from "@krizaka/ui/badge";
import { Button,buttonVariants } from "@krizaka/ui/button";
import { MessageBubble, MessageComposer, TypingIndicator } from "@krizaka/ui/chat";
import { Checkbox } from "@krizaka/ui/checkbox";
import { Countdown } from "@krizaka/ui/countdown";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";
import { type Presence,PRESENCES } from "@/lib/presences";

export interface MomentProps {
  /** Is an engine configured? When not, the moment says it is not available right now — it never answers by itself. */
  available: boolean;
  minutes: number;
  /** The presence that has stopped for today or this week: when it opens again (ISO), else null. */
  stops: { reason: "DAY" | "WEEK"; nextAt: string } | null;
}

interface Line {
  who: "person" | "presence";
  text: string;
}

const CrisisSchema = z.object({
  text: z.string(),
  resource: z.object({ label: z.string(), contact: z.string(), availability: z.string(), sourceUrl: z.string(), verifiedOn: z.string() }).nullable(),
});
type Crisis = z.infer<typeof CrisisSchema>;
const StartedSchema = z.object({ moment: z.object({ id: z.string(), presence: z.string(), endsAt: z.string() }) });
const TurnSchema = z.object({
  turn: z.object({ sentences: z.array(z.object({ text: z.string() })), crisis: CrisisSchema.nullable(), declined: z.object({ text: z.string() }).nullable() }),
  nearlyOver: z.boolean(),
});
type Started = z.infer<typeof StartedSchema>["moment"];

/**
 * The lines to call: always on the screen, whatever the moment is doing. These are links, not a feature that has to load.
 * The wording is the lexicon's (« Besoin d'aide maintenant ? », « Appeler le 9-8-8 »).
 */
export function HelpNow() {
  const { say } = useSay();
  return (
    <aside aria-label={say("moment.helpQuestion")} data-testid="help-now" className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-default bg-surface-1 px-3 py-2">
      <p className="min-w-0 flex-1 basis-40 text-sm">
        <strong className="font-semibold text-fg">{say("moment.helpQuestion")}</strong> <span className="text-fg-secondary">{say("moment.helpText")}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <a className={buttonVariants({ variant: "primary", size: "sm", shape: "cut" })} href="tel:988">
          {say("moment.call")}
        </a>
        <a className={buttonVariants({ variant: "secondary", size: "sm", shape: "cut" })} href="sms:988">
          {say("moment.text")}
        </a>
        <a className={buttonVariants({ variant: "secondary", size: "sm", shape: "cut" })} href="tel:811">
          {say("moment.infoSocial")}
        </a>
      </div>
    </aside>
  );
}

/** The presence's face for now: its initial and the permanent AI mark. The animated portrait comes with the face (docs/FRAMEWORK.md). */
function Face({ presence }: { presence: Presence }) {
  const { say } = useSay();
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg" fallback={presence.name.slice(0, 1)} alt="" />
      <div className="flex flex-col gap-1">
        <span className="font-display text-lg font-extrabold text-fg">{presence.name}</span>
        <Badge tone="accent" size="md">
          {say("moment.aiMark")}
        </Badge>
      </div>
    </div>
  );
}

const STYLE = { lea: "moment.styleLea", samuel: "moment.styleSamuel", noor: "moment.styleNoor" } as const;

const fmt = (iso: string, locale: string) => new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** The Moment: choose a presence, agree to what is kept, talk in text with captions on both sides, until the moment stops. */
export function MomentView({ available, minutes, stops }: MomentProps) {
  const { say, locale } = useSay();
  const [chosen, setChosen] = useState<Presence | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [moment, setMoment] = useState<Started | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [crisis, setCrisis] = useState<Crisis | null>(null);
  const [ended, setEnded] = useState<"over" | "closed" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [nearly, setNearly] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const start = useMutation({
    mutationFn: (presence: Presence) => krizakaFetch("/api/moment/start", { schema: StartedSchema, method: "POST", json: { presence: presence.id, language: locale, agreed: true } }),
    onSuccess: (r, presence) => {
      setMoment(r.moment);
      setLines([{ who: "presence", text: say("moment.opening", { name: presence.name }) }]);
      setNote(null);
    },
    onError: (e) => setNote(say(`errors.${errorKey(e)}`)),
  });
  const turn = useMutation({
    mutationFn: (text: string) => krizakaFetch("/api/moment/turn", { schema: TurnSchema, method: "POST", json: { momentId: moment?.id, text } }),
    onSuccess: (r) => {
      const t = r.turn;
      if (t.crisis) {
        setCrisis(t.crisis);
        return;
      }
      const said = t.declined?.text ? [t.declined.text] : t.sentences.map((s) => s.text);
      setLines((l) => [...l, { who: "presence", text: said.join(" ") }]);
      setNearly(r.nearlyOver);
    },
    onError: (e) => {
      const key = errorKey(e);
      if (key === "MOMENT_OVER" || key === "MOMENT_NOT_FOUND") setEnded("over");
      else setNote(say(`errors.${key}`));
    },
  });
  const close = useMutation({
    mutationFn: () => krizakaFetch("/api/moment/end", { method: "POST", json: { momentId: moment?.id } }),
    onSettled: () => {
      setEnded("closed");
      setLines([]);
    },
  });

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [lines, turn.isPending]);

  const send = () => {
    const text = draft.trim();
    if (!text || turn.isPending || !moment) return;
    setLines((l) => [...l, { who: "person", text }]);
    setDraft("");
    setNote(null);
    turn.mutate(text);
  };

  // One frame for every state: the lines to call are the last thing on the screen, always.
  const frame = (body: React.ReactNode) => (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-1 py-4">{body}</div>
      <HelpNow />
    </div>
  );

  if (!available) {
    return frame(<Alert tone="warning" title={say("moment.unavailableTitle")}>{say("moment.unavailableText")}</Alert>);
  }

  if (crisis) {
    const name = chosen?.name ?? "";
    return frame(
      <section aria-labelledby="crisis-title" data-testid="crisis-panel" className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-2 p-4">
        <h2 id="crisis-title" className="font-display text-xl font-extrabold text-fg">
          {say("moment.crisisTitle")}
        </h2>
        <p className="text-sm text-fg-secondary">{say("moment.crisisStopped", { name })}</p>
        <p lang="fr" className="whitespace-pre-line text-base text-fg">
          {crisis.text}
        </p>
        {crisis.resource ? (
          <p className="text-xs text-fg-muted">
            {crisis.resource.label} · {crisis.resource.availability} ·{" "}
            <a className="underline" href={crisis.resource.sourceUrl} rel="noreferrer">
              {say("moment.crisisSource", { date: crisis.resource.verifiedOn })}
            </a>
          </p>
        ) : null}
      </section>,
    );
  }

  if (ended) {
    return frame(
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-extrabold text-fg">{ended === "over" ? say("moment.over") : say("moment.endedTitle")}</h2>
        <p className="text-fg-secondary">{say("moment.endedText")}</p>
        <div>
          <a className={buttonVariants({ variant: "secondary", size: "md", shape: "cut" })} href={`/${locale}`}>
            {say("moment.again")}
          </a>
        </div>
      </section>,
    );
  }

  if (!moment || !chosen) {
    return frame(
      <>
        <header className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-extrabold text-fg">{say("moment.title")}</h2>
          <p className="text-fg-secondary">{say("moment.lead")}</p>
        </header>
        {stops ? (
          <Alert tone="info">{say(stops.reason === "DAY" ? "moment.stopsDay" : "moment.stopsWeek", { time: fmt(stops.nextAt, locale) })}</Alert>
        ) : (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium text-fg">{say("moment.chooseTitle")}</legend>
              {PRESENCES.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-default bg-surface-1 p-3 has-[:checked]:border-accent">
                  <input type="radio" name="presence" className="sr-only" checked={chosen?.id === p.id} onChange={() => setChosen(p)} />
                  <Avatar size="md" fallback={p.name.slice(0, 1)} alt="" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-fg">{p.name}</span>
                    <span className="text-sm text-fg-secondary">{say(STYLE[p.id])}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <section className="flex flex-col gap-2 rounded-lg border border-border-default bg-surface-1 p-3">
              <h3 className="font-semibold text-fg">{say("moment.keepTitle")}</h3>
              <p className="text-sm text-fg-secondary">{say("moment.keepText")}</p>
              <p className="text-sm text-fg-secondary">{say("moment.limits", { minutes })}</p>
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)}>
                {say("moment.agree")}
              </Checkbox>
            </section>
            {note ? <Alert tone="danger">{note}</Alert> : null}
            <div>
              <Button size="lg" shape="cut" variant="primary" disabled={!chosen || !agreed} loading={start.isPending} onClick={() => chosen && start.mutate(chosen)}>
                {chosen ? say("moment.begin", { name: chosen.name }) : say("moment.chooseTitle")}
              </Button>
              {!agreed ? <p className="mt-2 text-xs text-fg-muted">{say("moment.agreeFirst")}</p> : null}
            </div>
          </>
        )}
      </>,
    );
  }

  const presence = chosen;
  return frame(
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Face presence={presence} />
        <Countdown target={moment.endsAt} label={say("moment.timerLabel")} showLabel units={{ d: "d", h: "h", m: "m", s: "s" }} />
      </header>
      <p className="text-xs text-fg-muted">{say("moment.aiNote", { name: presence.name })}</p>
      {nearly ? <Alert tone="info">{say("moment.nearlyOver")}</Alert> : null}
      <ol role="log" aria-label={say("moment.conversation")} aria-live="polite" className="flex flex-1 flex-col gap-2">
        {lines.map((l, i) => (
          <li key={i} className="list-none">
            <MessageBubble mine={l.who === "person"} text={l.text} context={l.who === "person" ? say("moment.you") : presence.name} />
          </li>
        ))}
        {turn.isPending ? (
          <li className="list-none">
            <TypingIndicator showLabel label={say("moment.listening", { name: presence.name })} />
          </li>
        ) : null}
        <div ref={end} />
      </ol>
      {note ? <Alert tone="danger">{note}</Alert> : null}
      <MessageComposer value={draft} onValueChange={setDraft} onSend={send} placeholder={say("moment.placeholder")} sendLabel={say("moment.send")} busy={turn.isPending} maxLength={2000} />
      <div>
        <Button size="sm" variant="ghost" loading={close.isPending} onClick={() => close.mutate()}>
          {say("moment.end")}
        </Button>
      </div>
    </>,
  );
}
