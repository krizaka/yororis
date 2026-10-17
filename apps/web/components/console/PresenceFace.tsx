"use client";

import { Avatar } from "@krizaka/ui/avatar";
import { Badge } from "@krizaka/ui/badge";
import { type RefObject, useEffect, useRef } from "react";

import { useSay } from "@/lib/i18n-client";
import type { Presence } from "@/lib/presences";

/**
 * The presence's face: a generated, fictitious person (never a real one) that breathes, wears the AI mark at all times, and
 * while it speaks follows the energy of the real signal that is playing (`energy`, 0..1, measured by `useSpeech`) — the lip-sync
 * source of the pack's listening data is `ENERGY`, because the voice turn returns no word timings and a computed track would lie
 * (ADR-076). The motion is CSS (`.presence-face*`, app/globals.css); this component only writes one custom property, ten times a
 * second, and only while a sentence plays. Calm under `prefers-reduced-motion` and under the member's own choice (`calm`).
 */
export function PresenceFace({ presence, speaking, energy, calm = false }: { presence: Presence; speaking: boolean; energy: RefObject<number>; calm?: boolean }) {
  const { say } = useSay();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!speaking || calm) {
      el.style.setProperty("--presence-energy", "0");
      return;
    }
    const id = setInterval(() => el.style.setProperty("--presence-energy", String(Math.min(1, energy.current * 2.4))), 80);
    return () => clearInterval(id);
  }, [speaking, calm, energy]);

  return (
    <div ref={root} className="presence-face" data-testid="presence-face" data-speaking={speaking} data-calm={calm} role="img" aria-label={say("moment.aiNote", { name: presence.name })}>
      <span className="presence-face__halo" aria-hidden="true" />
      <div className="presence-face__body">
        <Avatar className="presence-face__portrait" size="xl" src={presence.face} alt="" fallback={presence.name.slice(0, 1)} />
      </div>
      <Badge className="presence-face__mark" tone="accent" size="md">
        {say("moment.aiMark")}
      </Badge>
    </div>
  );
}
