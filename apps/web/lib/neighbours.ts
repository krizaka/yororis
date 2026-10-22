import { query } from "./db";

/**
 * The neighbours: the cast lives in the `neighbours` table; the account holds only its self-declared age band, the assigned neighbour and since
 * when. Assignment is random within the member's band (the adjacent band if the band has none). The neighbour moves out on a random rotation
 * of three to five weeks, and the member may go and see another at most once a day. Moving keeps attachment light: that is the point.
 * A neighbour remembers nothing: no chat, no summary, no note is stored anywhere.
 */
export const BANDS = ["18-24", "25-34", "35-49", "50-64", "65+"] as const;
export type Band = (typeof BANDS)[number];
export const isBand = (v: unknown): v is Band => typeof v === "string" && (BANDS as readonly string[]).includes(v);

const DAY = 24 * 3600 * 1000;
export const ROTATION_MIN_DAYS = 21;
export const ROTATION_MAX_DAYS = 35;

export interface Neighbour {
  id: string;
  name: string;
  band: Band;
  presence: string;
  humour: { fr: string; en: string };
  anecdotes: { fr: string; en: string };
  pace: { fr: string; en: string };
  line: { fr: string; en: string };
}

interface Row {
  id: string;
  name: string;
  band: Band;
  presence: string;
  humour_fr: string; humour_en: string;
  anecdotes_fr: string; anecdotes_en: string;
  pace_fr: string; pace_en: string;
  line_fr: string; line_en: string;
}
const toNeighbour = (r: Row): Neighbour => ({
  id: r.id, name: r.name, band: r.band, presence: r.presence,
  humour: { fr: r.humour_fr, en: r.humour_en }, anecdotes: { fr: r.anecdotes_fr, en: r.anecdotes_en },
  pace: { fr: r.pace_fr, en: r.pace_en }, line: { fr: r.line_fr, en: r.line_en },
});

export async function listNeighbours(): Promise<Neighbour[]> {
  return (await query<Row>("SELECT * FROM neighbours ORDER BY band, name")).map(toNeighbour);
}
export async function neighbourById(id: string): Promise<Neighbour | null> {
  const [r] = await query<Row>("SELECT * FROM neighbours WHERE id = $1", [id]);
  return r ? toNeighbour(r) : null;
}

/** The candidates for a band: its own neighbours, else the adjacent bands'; never one of `exclude`. */
function candidates(all: Neighbour[], band: Band, exclude: string[]): Neighbour[] {
  const at = BANDS.indexOf(band);
  for (const reach of [0, 1, 2, 5]) {
    const found = all.filter((n) => Math.abs(BANDS.indexOf(n.band) - at) <= reach && !exclude.includes(n.id));
    if (found.length) return found;
  }
  return [];
}
const pick = <T,>(list: T[], rand: () => number): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;
const dueFrom = (now: number, rand: () => number) => new Date(now + (ROTATION_MIN_DAYS + Math.floor(rand() * (ROTATION_MAX_DAYS - ROTATION_MIN_DAYS + 1))) * DAY);

/** Records the self-declared band and assigns a neighbour at random within it. Only the band, the neighbour and the date are kept. */
export async function assign(accountId: string, band: string, now: number, rand: () => number): Promise<Neighbour> {
  if (!isBand(band)) throw new Error("BAND");
  const chosen = pick(candidates(await listNeighbours(), band, []), rand);
  await query(
    "UPDATE accounts SET age_band = $2, neighbour_id = $3, neighbour_since = to_timestamp($4 / 1000.0), move_due_at = $5, moved_from = NULL WHERE id = $1",
    [accountId, band, chosen.id, now, dueFrom(now, rand)],
  );
  return chosen;
}

interface Held {
  age_band: Band | null;
  neighbour_id: string | null;
  move_due_at: Date | null;
  last_moved_at: Date | null;
  moved_from: string | null;
}
const held = async (accountId: string): Promise<Held | undefined> =>
  (await query<Held>("SELECT age_band, neighbour_id, move_due_at, last_moved_at, moved_from FROM accounts WHERE id = $1", [accountId]))[0];

async function moveTo(accountId: string, h: Held, now: number, rand: () => number, stamp: boolean): Promise<Neighbour> {
  const next = pick(candidates(await listNeighbours(), h.age_band as Band, h.neighbour_id ? [h.neighbour_id] : []), rand);
  await query(
    "UPDATE accounts SET moved_from = neighbour_id, neighbour_id = $2, neighbour_since = to_timestamp($3 / 1000.0), move_due_at = $4, last_moved_at = CASE WHEN $5 THEN to_timestamp($3 / 1000.0) ELSE last_moved_at END WHERE id = $1",
    [accountId, next.id, now, dueFrom(now, rand), stamp],
  );
  return next;
}

export interface Current {
  neighbour: Neighbour;
  /** Set once after a move (by rotation or by the member): the warm note « X a déménagé, Y emménage à côté ». Cleared by `seen`. */
  moved: { from: Neighbour; to: Neighbour } | null;
}

/** The member's neighbour now; a rotation that came due has happened (the previous neighbour never comes back at once). Null if not assigned yet. */
export async function current(accountId: string, now: number, rand: () => number): Promise<Current | null> {
  let h = await held(accountId);
  if (!h?.neighbour_id || !h.age_band) return null;
  if (h.move_due_at && h.move_due_at.getTime() <= now) {
    await moveTo(accountId, h, now, rand, false);
    h = await held(accountId);
  }
  const neighbour = await neighbourById(h!.neighbour_id!);
  if (!neighbour) return null;
  const from = h!.moved_from ? await neighbourById(h!.moved_from) : null;
  return { neighbour, moved: from ? { from, to: neighbour } : null };
}

export async function seen(accountId: string): Promise<void> {
  await query("UPDATE accounts SET moved_from = NULL WHERE id = $1", [accountId]);
}

export type Went = { ok: true; neighbour: Neighbour } | { ok: false; reason: "ONCE_A_DAY"; nextAt: number } | { ok: false; reason: "NOT_ASSIGNED" };

/** « Aller voir un autre voisin »: another neighbour, at most once a day (light, and cheap). */
export async function goSeeAnother(accountId: string, now: number, rand: () => number): Promise<Went> {
  const h = await held(accountId);
  if (!h?.neighbour_id || !h.age_band) return { ok: false, reason: "NOT_ASSIGNED" };
  if (h.last_moved_at && h.last_moved_at.getTime() > now - DAY) return { ok: false, reason: "ONCE_A_DAY", nextAt: h.last_moved_at.getTime() + DAY };
  return { ok: true, neighbour: await moveTo(accountId, h, now, rand, true) };
}

/** What the persona is told about the neighbour of this chat: name, humour, anecdotes, pace. Words, never a memory of anyone. */
export function profileOf(n: Neighbour, language: "fr" | "en"): string {
  return language === "fr"
    ? `Tu t'appelles ${n.name}. Ton humour : ${n.humour.fr}. Tes anecdotes préférées : ${n.anecdotes.fr}. Ton rythme : ${n.pace.fr}.`
    : `Your name is ${n.name}. Your humour: ${n.humour.en}. Your favourite anecdotes: ${n.anecdotes.en}. Your pace: ${n.pace.en}.`;
}
