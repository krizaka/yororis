import { pool } from "./db";

/** Versioned, forward-only migrations, applied at start under an advisory lock (two instances never race). */
export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE CHECK (email = lower(email)),
        password_hash text,
        name text NOT NULL,
        locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','fr')),
        role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER','ADMIN')),
        status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED')),
        subtitles boolean NOT NULL DEFAULT true,
        calm_motion boolean NOT NULL DEFAULT false,
        avatar text,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz
      );
      CREATE TABLE access_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX access_tokens_account ON access_tokens(account_id);
      CREATE TABLE password_resets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );`,
  },
  {
    version: 2,
    sql: `ALTER TABLE accounts ADD COLUMN consented_at timestamptz, ADD COLUMN terms_version text;`,
  },
];

const LOCK = 7_411_001;

export async function migrate(): Promise<number[]> {
  const client = await pool().connect();
  const applied: number[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK]);
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version int PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await client.query<{ version: number }>("SELECT version FROM schema_migrations")).rows.map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [m.version]);
        await client.query("COMMIT");
        applied.push(m.version);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK]).catch(() => undefined);
    client.release();
  }
  return applied;
}
