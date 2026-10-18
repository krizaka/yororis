"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { Button, buttonVariants } from "@krizaka/ui/button";
import { Spinner } from "@krizaka/ui/spinner";
import { useState } from "react";
import { z } from "zod";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

export const RemainingSchema = z.object({ today: z.number(), week: z.number(), nextAt: z.string().nullable() });
export const EndSchema = z.object({ canKeep: z.boolean(), remaining: RemainingSchema });
export type Remaining = z.infer<typeof RemainingSchema>;

const KeptSchema = z.object({ kept: z.object({ themes: z.array(z.string()), whatHelped: z.string(), smallStep: z.string(), takeAlong: z.array(z.string()) }) });

/** The person's own number, 1 to 5 — « Comment tu te sens, là ? C'est toi qui le dis ». Optional, never computed, never inferred. */
export function MoodPick({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm text-fg-secondary">{label}</span>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button key={n} type="button" size="sm" shape="cut" variant={value === n ? "primary" : "secondary"} aria-pressed={value === n} onClick={() => onChange(value === n ? null : n)}>
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface Draft {
  themes: string;
  whatHelped: string;
  smallStep: string;
  takeAlong: string;
}

const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * After the moment: what is left of the presence that stops (« come back later »), and — if the person wants — three lines of what they said, described by
 * the pack's Studio, that they read, edit, copy or let go. Nothing is stored here: the words are forgotten as soon as the lines are written.
 */
export function MomentClosing({ momentId, canKeep, remaining, language, moodBefore, over }: { momentId: string | null; canKeep: boolean; remaining: Remaining | null; language: string; moodBefore: number | null; over: boolean }) {
  const { say, locale } = useSay();
  const [phase, setPhase] = useState<"ask" | "kept" | "let-go">(canKeep ? "ask" : "let-go");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const keep = useMutation({
    mutationFn: () => krizakaFetch("/api/moment/keep", { schema: KeptSchema, method: "POST", json: { momentId, ...(moodBefore ? { moodBefore } : {}), ...(moodAfter ? { moodAfter } : {}) } }),
    onSuccess: ({ kept }) => {
      setDraft({ themes: kept.themes.join("\n"), whatHelped: kept.whatHelped, smallStep: kept.smallStep, takeAlong: kept.takeAlong.join("\n") });
      setPhase("kept");
      setNote(null);
    },
    onError: (e) => setNote(say(`errors.${errorKey(e)}`)),
  });
  const forget = useMutation({
    mutationFn: () => krizakaFetch("/api/moment/forget", { method: "POST", json: { momentId } }),
    onSettled: () => {
      setDraft(null);
      setPhase("let-go");
    },
  });

  const page = draft
    ? [say("moment.fieldThemes"), ...lines(draft.themes).map((l) => `- ${l}`), "", say("moment.fieldHelped"), draft.whatHelped, "", say("moment.fieldStep"), draft.smallStep, "", say("moment.fieldAlong"), ...lines(draft.takeAlong).map((l) => `- ${l}`)].join("\n")
    : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(page);
      setCopied(true);
    } catch {
      setNote(say("moment.copyFailed"));
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([page], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${say("moment.keptTitle").toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const time = remaining?.nextAt ? new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(remaining.nextAt)) : null;

  const field = (key: keyof Draft, label: string) => (
    <label key={key} className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-fg">{label}</span>
      <textarea className="min-h-16 rounded-lg border border-border-default bg-surface-1 p-2 text-base text-fg" value={draft?.[key] ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))} lang={language} />
    </label>
  );

  return (
    <section className="flex flex-col gap-4" data-testid="moment-closing">
      <h2 className="font-display text-xl font-extrabold text-fg">{over ? say("moment.over") : say("moment.endedTitle")}</h2>

      {phase === "ask" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-1 p-3">
          <h3 className="font-semibold text-fg">{say("moment.keepAskTitle")}</h3>
          <p className="text-sm text-fg-secondary">{say("moment.keepAskText")}</p>
          <MoodPick label={say("moment.moodAfter")} value={moodAfter} onChange={setMoodAfter} />
          {note ? <Alert tone="danger">{note}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="md" shape="cut" variant="primary" loading={keep.isPending} onClick={() => keep.mutate()}>
              {say("moment.keepYes")}
            </Button>
            <Button size="md" variant="ghost" disabled={keep.isPending} onClick={() => forget.mutate()}>
              {say("moment.keepNo")}
            </Button>
          </div>
          {keep.isPending ? (
            <p className="flex items-center gap-2 text-sm text-fg-secondary" role="status">
              <Spinner size="sm" label={say("moment.keepWorking")} /> {say("moment.keepWorking")}
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "kept" && draft ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-1 p-3">
          <h3 className="font-semibold text-fg">{say("moment.keptTitle")}</h3>
          <p className="text-sm text-fg-secondary">{say("moment.keptHelp")}</p>
          {field("themes", say("moment.fieldThemes"))}
          {field("whatHelped", say("moment.fieldHelped"))}
          {field("smallStep", say("moment.fieldStep"))}
          {field("takeAlong", say("moment.fieldAlong"))}
          {note ? <Alert tone="danger">{note}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="md" shape="cut" variant="secondary" onClick={copy}>
              {copied ? say("moment.copied") : say("moment.copy")}
            </Button>
            <Button size="md" shape="cut" variant="secondary" onClick={download}>
              {say("moment.download")}
            </Button>
            <Button size="md" variant="ghost" onClick={() => { setDraft(null); setPhase("let-go"); }}>
              {say("moment.dropAll")}
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "let-go" ? <p className="text-fg-secondary">{say("moment.endedText")}</p> : null}

      {remaining ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border-default bg-surface-1 p-3" data-testid="come-back-later">
          <h3 className="font-semibold text-fg">{say("moment.laterTitle")}</h3>
          <p className="text-sm text-fg-secondary">{say("moment.laterLeft", { today: remaining.today, week: remaining.week })}</p>
          <p className="text-sm text-fg-secondary">{time ? say("moment.laterNext", { time }) : say("moment.laterOpen")}</p>
        </div>
      ) : null}

      <div>
        <a className={buttonVariants({ variant: "secondary", size: "md", shape: "cut" })} href={`/${locale}`}>
          {say("moment.again")}
        </a>
      </div>
    </section>
  );
}
