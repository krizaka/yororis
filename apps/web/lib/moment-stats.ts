/**
 * What the organisation sees of the moments: counts and durations, never a word. One line per moment — when (to the hour), which presence, in which
 * language, how long, how many turns, how it ended, whether the lines to call were shown, whether the person kept lines — and nothing that says who
 * (the console shows aggregate statistics only, docs/FRAMEWORK.md). In memory like everything here, lost at every start.
 */
export type Outcome = "open" | "closed" | "over" | "lines";

export interface MomentStat {
  id: string;
  /** The hour the moment began (ISO, minutes and seconds dropped). */
  hour: string;
  presence: string;
  language: "en" | "fr";
  durationSec: number | null;
  turns: number;
  outcome: Outcome;
  /** The pack's fixed reply — the lines to call — was shown. */
  lines: boolean;
  kept: boolean;
  /** For `open` moments: when they stop on their own. */
  endsAt: number;
  startedAt: number;
}

const holder = globalThis as unknown as { __yororisStats?: MomentStat[] };
const ledger = () => (holder.__yororisStats ??= []);
export const resetStats = () => {
  holder.__yororisStats = [];
};

const hourOf = (t: number) => new Date(Math.floor(t / 3_600_000) * 3_600_000).toISOString();

export function openStat(input: { presence: string; language: "en" | "fr"; startedAt: number; endsAt: number }): string {
  const id = crypto.randomUUID();
  ledger().push({ id, hour: hourOf(input.startedAt), presence: input.presence, language: input.language, durationSec: null, turns: 0, outcome: "open", lines: false, kept: false, endsAt: input.endsAt, startedAt: input.startedAt });
  ledger().splice(0, Math.max(0, ledger().length - 5000));
  return id;
}

export function updateStat(id: string | undefined, patch: Partial<Pick<MomentStat, "turns" | "outcome" | "lines" | "kept">> & { endedAt?: number }): void {
  const s = id ? ledger().find((x) => x.id === id) : undefined;
  if (!s) return;
  const { endedAt, ...rest } = patch;
  Object.assign(s, rest);
  if (endedAt !== undefined && s.durationSec === null) s.durationSec = Math.max(0, Math.round((Math.min(endedAt, s.endsAt) - s.startedAt) / 1000));
}

/** A moment still open past its end stopped on its own: that is « over ». */
const settled = (s: MomentStat, now: number): MomentStat => (s.outcome === "open" && now >= s.endsAt ? { ...s, outcome: "over", durationSec: Math.round((s.endsAt - s.startedAt) / 1000) } : s);

export interface StatQuery {
  sort: "hour" | "durationSec" | "turns" | "outcome";
  dir: "asc" | "desc";
  page: number;
  size: number;
  outcome?: string[];
}

export function listStats(q: StatQuery, now = Date.now()): { rows: Omit<MomentStat, "endsAt" | "startedAt">[]; total: number } {
  let rows = ledger().map((s) => settled(s, now));
  if (q.outcome?.length) rows = rows.filter((r) => q.outcome?.includes(r.outcome));
  const key = q.sort;
  rows = [...rows].sort((a, b) => (key === "hour" || key === "outcome" ? String(a[key]).localeCompare(String(b[key])) : (a[key] ?? 0) - (b[key] ?? 0)) * (q.dir === "asc" ? 1 : -1));
  return { total: rows.length, rows: rows.slice((q.page - 1) * q.size, q.page * q.size).map((r) => ({ id: r.id, hour: r.hour, presence: r.presence, language: r.language, durationSec: r.durationSec, turns: r.turns, outcome: r.outcome, lines: r.lines, kept: r.kept })) };
}

export function summarise(now = Date.now()) {
  const all = ledger().map((s) => settled(s, now));
  const done = all.filter((s) => s.outcome !== "open" && s.durationSec !== null);
  const day = now - 24 * 3600_000;
  const closed = all.filter((s) => s.outcome !== "open");
  return {
    moments: all.length,
    last24h: all.filter((s) => s.startedAt > day).length,
    averageSeconds: done.length ? Math.round(done.reduce((a, s) => a + (s.durationSec ?? 0), 0) / done.length) : 0,
    linesShown: all.filter((s) => s.lines).length,
    keptShare: closed.length ? Math.round((closed.filter((s) => s.kept).length / closed.length) * 100) : 0,
  };
}
