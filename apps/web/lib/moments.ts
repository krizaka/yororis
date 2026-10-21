import { endsAt, type Limits } from "./moment-policy";
import { openStat } from "./moment-stats";
import type { PresenceId } from "./presences";

/**
 * The moments in progress and taken, in memory (no database, nothing written). While a moment lasts its last exchanges are held here as the
 * context of the next turn; `finish` (and the sweep) forgets them. Nothing of what is said is ever written down.
 */
export interface Moment {
  id: string;
  memberId: string;
  presence: PresenceId;
  language: "en" | "fr";
  conversationId: string;
  startedAt: number;
  endsAt: number;
  turns: number;
  /** The last exchanges, in memory while the moment lasts: they are the context of the next turn (Orazaka's voice turn keeps none). */
  recent: { who: "person" | "presence"; text: string }[];
  busy: boolean;
  ended: boolean;
  /** The line of this moment in the organisation's counts (lib/moment-stats.ts): no words, no name. */
  statId: string;
}

/** An abandoned moment (nobody ended it) is forgotten this long after it should have ended. */
const ABANDONED_MS = 15 * 60_000;

type State = { live: Map<string, Moment>; taken: Map<string, number[]> };
const holder = globalThis as unknown as { __yororisMoments?: State };
const state = () => (holder.__yororisMoments ??= { live: new Map<string, Moment>(), taken: new Map<string, number[]>() });

/** Forgets what nobody came back for: a moment abandoned past its end. */
export function sweep(now = Date.now()): number {
  let n = 0;
  for (const [id, m] of state().live) {
    if (now - m.endsAt > ABANDONED_MS) {
      m.recent = [];
      state().live.delete(id);
      n += 1;
    }
  }
  return n;
}

export const resetMoments = () => {
  holder.__yororisMoments = { live: new Map(), taken: new Map() };
};
/** The member's starts of the last seven days, loaded from the database (dates only) into the counter: it survives a restart. */
export function hydrateTaken(memberId: string, starts: number[]): void {
  state().taken.set(memberId, [...starts].sort((a, b) => a - b));
}
export const takenBy = (memberId: string) => (state().taken.get(memberId) ?? []).map((startedAt) => ({ startedAt }));
export const liveOf = (memberId: string) => [...state().live.values()].find((m) => m.memberId === memberId && !m.ended);
export const findMoment = (id: string, memberId: string) => {
  sweep();
  const m = state().live.get(id);
  return m && m.memberId === memberId ? m : undefined;
};

export function begin(input: { memberId: string; presence: PresenceId; language: "en" | "fr" }, limits: Limits, now = Date.now()): Moment {
  const moment: Moment = {
    id: crypto.randomUUID(),
    memberId: input.memberId,
    presence: input.presence,
    language: input.language,
    conversationId: crypto.randomUUID(),
    startedAt: now,
    endsAt: endsAt(now, limits),
    turns: 0,
    recent: [],
    busy: false,
    ended: false,
    statId: openStat({ presence: input.presence, language: input.language, startedAt: now, endsAt: endsAt(now, limits) }),
  };
  state().live.set(moment.id, moment);
  state().taken.set(input.memberId, [...(state().taken.get(input.memberId) ?? []).filter((t) => t > now - 7 * 24 * 3600 * 1000), now]);
  return moment;
}

/** The context a turn carries: the last exchanges, newest last, within the 2 000 tokens Orazaka accepts (counted as 8 000 characters). */
export function contextOf(moment: Moment, limit = 6000): string {
  const lines = moment.recent.map((r) => `${r.who === "person" ? "Person" : "Presence"}: ${r.text}`);
  while (lines.length > 1 && lines.join("\n").length > limit) lines.shift();
  return lines.join("\n").slice(-limit);
}

export function remember(moment: Moment, person: string, presence: string): void {
  moment.recent.push({ who: "person", text: person }, { who: "presence", text: presence });
  moment.recent.splice(0, Math.max(0, moment.recent.length - 12));
}

export function finish(moment: Moment): void {
  moment.recent = [];
  moment.ended = true;
  state().live.delete(moment.id);
}
