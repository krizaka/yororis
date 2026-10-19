import { endsAt, type Limits } from "./moment-policy";
import { openStat } from "./moment-stats";
import type { PresenceId } from "./presences";

/**
 * The moments in progress and taken, in memory (no database, nothing written). While a moment lasts, and for the few minutes the person
 * takes to choose what they keep (CLOSING_MS), its words are held here; `finish` (and the sweep) forgets them. Nothing is ever written down.
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
  /** The whole moment, in order, held only until the person has chosen what they keep (or forgotten it). */
  log: { who: "person" | "presence"; text: string }[];
  busy: boolean;
  ended: boolean;
  /** The line of this moment in the organisation's counts (lib/moment-stats.ts): no words, no name. */
  statId: string;
  /** Set when the person closes the moment: the words wait here for the choice, then are forgotten. */
  endedAt: number | null;
}

/** How long the words wait for the person's choice after the moment ends. */
export const CLOSING_MS = 15 * 60_000;

export const MAX_TURNS = 60;

type State = { live: Map<string, Moment>; taken: Map<string, number[]> };
const holder = globalThis as unknown as { __yororisMoments?: State };
const state = () => (holder.__yororisMoments ??= { live: new Map<string, Moment>(), taken: new Map<string, number[]>() });

/** Forgets what nobody came back for: a closed moment past CLOSING_MS, an abandoned one long past its end. */
export function sweep(now = Date.now()): number {
  let n = 0;
  for (const [id, m] of state().live) {
    if ((m.endedAt !== null && now - m.endedAt > CLOSING_MS) || now - m.endsAt > CLOSING_MS) {
      m.recent = [];
      m.log = [];
      state().live.delete(id);
      n += 1;
    }
  }
  return n;
}

export const resetMoments = () => {
  holder.__yororisMoments = { live: new Map(), taken: new Map() };
};
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
    log: [],
    busy: false,
    ended: false,
    endedAt: null,
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
  moment.log.push({ who: "person", text: person }, { who: "presence", text: presence });
  moment.log.splice(0, Math.max(0, moment.log.length - 2 * MAX_TURNS));
}

/** The moment as lines, for the Studio that describes what the person keeps (30 000 characters at most, the newest kept). */
export function turnsOf(moment: Moment, limit = 30_000): string {
  const lines = moment.log.map((r) => `${r.who === "person" ? "Person" : "Presence"}: ${r.text}`);
  while (lines.length > 1 && lines.join("\n").length > limit) lines.shift();
  return lines.join("\n").slice(-limit);
}

/** The person closes the moment: no more turns, the words wait for their choice. */
export function close(moment: Moment, now = Date.now()): void {
  moment.ended = true;
  moment.endedAt = now;
  moment.recent = [];
}

export function finish(moment: Moment): void {
  moment.recent = [];
  moment.log = [];
  moment.ended = true;
  state().live.delete(moment.id);
}
