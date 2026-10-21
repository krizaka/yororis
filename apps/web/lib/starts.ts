import { query } from "./db";

/** The counter of the presence that stops, kept per account as dates only (no text, no theme, no outcome): it survives a restart. */
export async function loadStarts(accountId: string): Promise<number[]> {
  const rows = await query<{ started_at: Date }>("SELECT started_at FROM moment_starts WHERE account_id = $1 AND started_at > now() - interval '7 days' ORDER BY started_at", [accountId]);
  return rows.map((r) => r.started_at.getTime());
}

export async function recordStart(accountId: string, at: number): Promise<void> {
  await query("INSERT INTO moment_starts (account_id, started_at) VALUES ($1, to_timestamp($2 / 1000.0))", [accountId, at]);
  await query("DELETE FROM moment_starts WHERE account_id = $1 AND started_at <= now() - interval '7 days'", [accountId]);
}
