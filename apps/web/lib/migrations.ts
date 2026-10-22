import { pool } from "./db";
import { NEIGHBOURS } from "./neighbours-seed";

/** Versioned, forward-only migrations, applied at start under an advisory lock (two instances never race). */
export const MIGRATIONS: { version: number; sql: string; after?: (run: (text: string, values?: unknown[]) => Promise<unknown>) => Promise<void> }[] = [
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
  {
    version: 3,
    sql: `CREATE TABLE moment_starts (
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      started_at timestamptz NOT NULL
    );
    CREATE INDEX moment_starts_account ON moment_starts(account_id, started_at);`,
  },
  {
    // The neighbours (#112 to #115): a cast as data, and per account only the self-declared age band, the assigned neighbour and when.
    version: 4,
    sql: `CREATE TABLE neighbours (
      id text PRIMARY KEY,
      name text NOT NULL UNIQUE,
      band text NOT NULL CHECK (band IN ('18-24','25-34','35-49','50-64','65+')),
      presence text NOT NULL,
      humour_fr text NOT NULL, humour_en text NOT NULL,
      anecdotes_fr text NOT NULL, anecdotes_en text NOT NULL,
      pace_fr text NOT NULL, pace_en text NOT NULL,
      line_fr text NOT NULL, line_en text NOT NULL
    );
    ALTER TABLE accounts
      ADD COLUMN age_band text CHECK (age_band IN ('18-24','25-34','35-49','50-64','65+')),
      ADD COLUMN neighbour_id text REFERENCES neighbours(id),
      ADD COLUMN neighbour_since timestamptz,
      ADD COLUMN move_due_at timestamptz,
      ADD COLUMN last_moved_at timestamptz,
      ADD COLUMN moved_from text REFERENCES neighbours(id);`,
    after: async (run) => {
      for (const n of NEIGHBOURS) {
        await run(
          "INSERT INTO neighbours (id, name, band, presence, humour_fr, humour_en, anecdotes_fr, anecdotes_en, pace_fr, pace_en, line_fr, line_en) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [n.id, n.name, n.band, n.presence, n.humour.fr, n.humour.en, n.anecdotes.fr, n.anecdotes.en, n.pace.fr, n.pace.en, n.line.fr, n.line.en],
        );
      }
    },
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
        await m.after?.((text, values) => client.query(text, values));
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
