"use client";

import { Mascot } from "@krizaka/ui/mascots";
import { Waveform } from "@krizaka/ui/waveform";
import { Badge } from "@krizaka/ui/badge";
import type { Messages } from "@/lib/messages";

/** Peaks of a calm voice, drawn here (stylised): not a recording, not derived from anything. */
const PEAKS = [0.2, 0.34, 0.5, 0.42, 0.62, 0.8, 0.58, 0.7, 0.46, 0.3, 0.52, 0.74, 0.9, 0.66, 0.4, 0.28, 0.44, 0.6, 0.76, 0.5, 0.36, 0.24, 0.4, 0.55, 0.32, 0.2] as const;

/**
 * « Un visage et une voix », as a preview: a stylised portrait (the crane — the product's bird — in a ring, with the permanent
 * « AI » mark), a gentle waveform and three sample captions. It is marked « preview, under construction » and says it is a
 * sample: nothing here is a recording, a screen or a person. The captions are lines the lexicon approves for the presence.
 * The take of the real moment replaces it when it exists. Decorative motion only (off under reduced motion).
 */
export function PresencePreview({ m }: { m: Messages["hero"]["preview"] }) {
  return (
    <div className="yo-presence" role="group" aria-label={m.aria}>
      <div className="yo-presence-top">
        <Badge tone="warning">{m.label}</Badge>
      </div>
      <div className="yo-presence-face">
        <div className="yo-presence-ring yo-hero-crane">
          <Mascot bird="crane" mood="welcome" size={132} className="yo-presence-crane" />
          <span className="yo-presence-mark" aria-label={m.mark}>
            {m.mark}
          </span>
        </div>
        <div className="yo-presence-id">
          <p className="yo-presence-name">{m.name}</p>
          <p className="yo-presence-role">{m.role}</p>
        </div>
      </div>
      <div className="yo-presence-voice" aria-hidden>
        <Waveform peaks={PEAKS} bars={40} size="md" playing />
      </div>
      <ol className="yo-presence-caps" aria-label={m.captionsLabel}>
        {m.captions.map((c) => (
          <li key={c} className="yo-cap">
            {c}
          </li>
        ))}
      </ol>
      <p className="yo-presence-note">{m.note}</p>
    </div>
  );
}
