import { endsAt, type Limits } from "./moment-policy";
import type { PresenceId } from "./presences";

/**
 * The moments in progress and taken, in memory (construction mode: no database, nothing written). A moment holds no words:
 * what is said is in Orazaka's conversation and on the person's screen, and `end` forgets the moment here.
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
}

export const MAX_TURNS = 60;

type State = { live: Map<string, Moment>; taken: Map<string, number[]> };
const holder = globalThis as unknown as { __yororisMoments?: State };
const state = () => (holder.__yororisMoments ??= { live: new Map<string, Moment>(), taken: new Map<string, number[]>() });

export const resetMoments = () => {
  holder.__yororisMoments = { live: new Map(), taken: new Map() };
};
export const takenBy = (memberId: string) => (state().taken.get(memberId) ?? []).map((startedAt) => ({ startedAt }));
export const liveOf = (memberId: string) => [...state().live.values()].find((m) => m.memberId === memberId && !m.ended);
export const findMoment = (id: string, memberId: string) => {
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
