import pg from "pg";

/**
 * The accounts database (invited testers only, docs/FRAMEWORK.md §5): one pool per process on the shared cluster, TLS verified
 * against the cluster's CA, never `rejectUnauthorized: false`. Without a database URL the app runs on its fictional cast (local, CI).
 */
export const dbConfigured = (env: Record<string, string | undefined> = process.env) => !!env.DATABASE_URL?.trim();

export function poolConfig(env: Record<string, string | undefined> = process.env): pg.PoolConfig {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set");
  const ca = env.DATABASE_CA_CERT?.trim().replace(/\\n/g, "\n");
  const local = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
  return { connectionString: url.replace(/[?&]sslmode=[^&]*/, ""), max: 5, ssl: local ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true } };
}

const holder = globalThis as unknown as { __yororisPool?: pg.Pool };
export const pool = (): pg.Pool => (holder.__yororisPool ??= new pg.Pool(poolConfig()));

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  return (await pool().query<T>(text, values)).rows;
}

export async function endPool(): Promise<void> {
  await holder.__yororisPool?.end();
  holder.__yororisPool = undefined;
}
