/**
 * The presence that stops (C2 of the programme): a moment has a longest length, and there are so many a day and a week.
 * Pure functions of the moments already taken and the clock — the route handlers hold the state, the tests hold the dates.
 */
export interface Limits {
  minutes: number;
  perDay: number;
  perWeek: number;
  /** How many turns a moment has: the neighbour closes after the last one. */
  turns: number;
}

export interface Taken {
  startedAt: number;
}

const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;

export type Allowance = { ok: true } | { ok: false; reason: "DAY" | "WEEK"; nextAt: number };

/** May a new moment start now? Otherwise: which limit holds, and when the next one opens (rolling windows). */
export function allowance(taken: readonly Taken[], now: number, limits: Limits): Allowance {
  const within = (window: number) => taken.filter((t) => t.startedAt > now - window).map((t) => t.startedAt).sort((a, b) => a - b);
  const day = within(DAY);
  const week = within(WEEK);
  const dayAt = day.length >= limits.perDay ? day[day.length - limits.perDay] + DAY : 0;
  const weekAt = week.length >= limits.perWeek ? week[week.length - limits.perWeek] + WEEK : 0;
  if (!dayAt && !weekAt) return { ok: true };
  return dayAt >= weekAt ? { ok: false, reason: "DAY", nextAt: dayAt } : { ok: false, reason: "WEEK", nextAt: weekAt };
}

export const endsAt = (startedAt: number, limits: Limits) => startedAt + limits.minutes * 60_000;
export const isOver = (startedAt: number, now: number, limits: Limits) => now >= endsAt(startedAt, limits);
/** The presence says it is nearly over at this point (T minus two minutes). */
export const isNearlyOver = (startedAt: number, now: number, limits: Limits) => !isOver(startedAt, now, limits) && endsAt(startedAt, limits) - now <= 2 * 60_000;

/** What is left of the presence that stops: moments today and this week, and when the next one opens if none is left (rolling windows). */
export function remainingFor(taken: readonly Taken[], now: number, limits: Limits): { today: number; week: number; nextAt: number | null } {
  const within = (window: number) => taken.filter((t) => t.startedAt > now - window).length;
  const today = Math.max(0, limits.perDay - within(DAY));
  const week = Math.max(0, limits.perWeek - within(WEEK));
  const may = allowance(taken, now, limits);
  return { today: Math.min(today, week), week, nextAt: may.ok ? null : may.nextAt };
}
