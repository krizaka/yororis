"use client";

import { buttonVariants } from "@krizaka/ui/button";
import { z } from "zod";

import { useSay } from "@/lib/i18n-client";

export const RemainingSchema = z.object({ today: z.number(), week: z.number(), nextAt: z.string().nullable() });
export const EndSchema = z.object({ remaining: RemainingSchema });
export type Remaining = z.infer<typeof RemainingSchema>;

/** After the moment: what was said is gone; what is left of the presence that stops (« come back later »), and one way back. Nothing is described or taken away. */
export function MomentClosing({ remaining, over }: { remaining: Remaining | null; over: boolean }) {
  const { say, locale } = useSay();
  const time = remaining?.nextAt ? new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(remaining.nextAt)) : null;
  return (
    <section className="flex flex-col gap-4" data-testid="moment-closing">
      <h2 className="font-display text-xl font-extrabold text-fg">{over ? say("moment.over") : say("moment.endedTitle")}</h2>
      <p className="text-fg-secondary">{say("moment.endedText")}</p>
      {remaining ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border-default bg-surface-1 p-3" data-testid="come-back-later">
          <h3 className="font-semibold text-fg">{say("moment.laterTitle")}</h3>
          <p className="text-sm text-fg-secondary">{say("moment.laterLeft", { today: remaining.today, week: remaining.week })}</p>
          <p className="text-sm text-fg-secondary">{time ? say("moment.laterNext", { time }) : say("moment.laterOpen")}</p>
        </div>
      ) : null}
      <div>
        <a className={buttonVariants({ variant: "secondary", size: "md" })} href={`/${locale}`}>
          {say("moment.again")}
        </a>
      </div>
    </section>
  );
}
