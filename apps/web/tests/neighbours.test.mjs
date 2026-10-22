// The neighbours (#112 to #115): a cast of AI neighbours as data, one assigned at random within the member's self-declared age band (a band,
// never a birth date), who sometimes moves out (rotation) and whom the member may go and leave for another at most once a day.
// Only `member -> neighbour + since` is stored. Runs on a real Postgres (TEST_DATABASE_URL; CI starts one).
import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set (no local Postgres)";
if (url) process.env.DATABASE_URL = `${url}?options=-c%20search_path%3Dt_neighbours`;
process.env.AUTH_SESSION_SECRET = "t".repeat(40);
delete process.env.AUTH_DEMO_PASSWORD;

const DAY = 24 * 3600 * 1000;
const NEVER = [/th[ée]rap/i, /\bpsy/i, /soigne|\bsoins?\b|\bcare\b|\bcure\b|gu[ée]ri/i, /\btreat/i, /diagnos/i, /clinic/i, /m[ée]dica/i, /\bpatient/i, /s[ée]ance|\bsession/i, /coach/i, /health canada|sant[ée] canada|bien-?[êe]tre|wellbeing/i];
let db, migrations, accounts, n, seed;
let seq = 0;
const newAccount = async (band) => {
  const m = await accounts.provisionAccount({ email: `n${++seq}@example.test`, name: `N${seq}`, password: "a-long-test-passphrase-1" });
  if (band) await n.assign(m.id, band, Date.now(), Math.random);
  return m;
};

before(async () => {
  if (skip) return;
  db = await import("../lib/db.ts");
  migrations = await import("../lib/migrations.ts");
  accounts = await import("../lib/accounts.ts");
  n = await import("../lib/neighbours.ts");
  seed = await import("../lib/neighbours-seed.ts");
  await db.query("DROP SCHEMA IF EXISTS t_neighbours CASCADE; CREATE SCHEMA t_neighbours");
  await migrations.migrate();
});
after(async () => {
  if (!skip) await db.endPool();
});

test("the cast is data: a table seeded by a migration, short names drawn from Yororis, every age band covered, names unique", { skip }, async () => {
  const rows = await n.listNeighbours();
  assert.deepEqual(rows.map((r) => r.name).sort(), ["Ori", "Oris", "Oro", "Rori", "Yori", "Yoris", "Yoro", "Yoyo"]);
  assert.ok(rows.every((r) => r.name.length <= 5 && /^[A-Z][a-z]+$/.test(r.name)));
  for (const band of n.BANDS) assert.ok(rows.some((r) => r.band === band), `a neighbour for ${band}`);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  assert.equal(rows.length, seed.NEIGHBOURS.length);
});

test("the cast obeys the lexicon and the style: no care or health wording, no em dash, both languages, a profile of humour, anecdotes and pace", () => {
  for (const x of seed.NEIGHBOURS) {
    for (const field of ["humour", "anecdotes", "pace", "line"]) {
      for (const l of ["fr", "en"]) {
        const text = x[field][l];
        assert.ok(text && text.length > 3, `${x.name}.${field}.${l}`);
        assert.ok(!text.includes("—"), `${x.name}.${field}.${l}: no em dash`);
        for (const re of NEVER) assert.ok(!re.test(text), `${re} in ${x.name}.${field}.${l}`);
      }
    }
  }
});

test("assignment is random within the declared band, and stores only the band, the neighbour and when", { skip }, async () => {
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const m = await newAccount();
    const got = await n.assign(m.id, "25-34", Date.now(), Math.random);
    assert.equal(got.band, "25-34");
    seen.add(got.id);
  }
  assert.equal(seen.size, 2, "both neighbours of the band come up");
  const cols = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 't_neighbours' AND table_name = 'accounts'")).map((r) => r.column_name);
  assert.ok(!cols.some((c) => /birth|born|dob|age$/.test(c)), "no birth date, no age");
  const [row] = await db.query("SELECT age_band, neighbour_id, neighbour_since FROM accounts WHERE neighbour_id IS NOT NULL LIMIT 1");
  assert.ok(row.age_band && row.neighbour_id && row.neighbour_since);
});

test("a band without a neighbour of its own falls back to the adjacent band; an invalid band is refused", { skip }, async () => {
  const m = await newAccount();
  await assert.rejects(n.assign(m.id, "40-45", Date.now(), Math.random), /BAND/);
  await assert.rejects(n.assign(m.id, "1990-01-01", Date.now(), Math.random), /BAND/);
  const got = await n.assign(m.id, "65+", Date.now(), () => 0);
  assert.equal(got.band, "65+");
});

test("rotation: the neighbour moves out when the draw says so, never to the same one, with a warm note shown once", { skip }, async () => {
  const m = await newAccount("35-49");
  const t0 = Date.now();
  const first = await n.current(m.id, t0, Math.random);
  assert.equal(first.moved, null);
  const [{ move_due_at }] = await db.query("SELECT move_due_at FROM accounts WHERE id = $1", [m.id]);
  const due = new Date(move_due_at).getTime();
  assert.ok(due >= t0 + 21 * DAY - 1000 && due <= t0 + 35 * DAY + 1000, "a random rotation of three to five weeks");
  const early = await n.current(m.id, due - DAY, Math.random);
  assert.equal(early.neighbour.id, first.neighbour.id);
  const later = await n.current(m.id, due + 1000, Math.random);
  assert.notEqual(later.neighbour.id, first.neighbour.id, "never the same neighbour");
  assert.equal(later.moved.from.id, first.neighbour.id);
  assert.equal(later.moved.to.id, later.neighbour.id);
  await n.seen(m.id);
  assert.equal((await n.current(m.id, due + 2000, Math.random)).moved, null, "the note is shown once");
});

test("« aller voir un autre voisin »: at most once a day, never the same neighbour", { skip }, async () => {
  const m = await newAccount("25-34");
  const t0 = Date.now();
  const a = await n.current(m.id, t0, Math.random);
  const moved = await n.goSeeAnother(m.id, t0 + 1000, Math.random);
  assert.equal(moved.ok, true);
  assert.notEqual(moved.neighbour.id, a.neighbour.id);
  const again = await n.goSeeAnother(m.id, t0 + 2 * 3600_000, Math.random);
  assert.equal(again.ok, false);
  assert.equal(again.reason, "ONCE_A_DAY");
  assert.ok(again.nextAt > t0 + 2 * 3600_000);
  assert.equal((await n.goSeeAnother(m.id, t0 + DAY + 5000, Math.random)).ok, true, "a day later it is possible again");
});

test("a neighbour remembers nothing: the account holds the neighbour and when, nothing of any chat; deleting the account deletes it", { skip }, async () => {
  const m = await newAccount("18-24");
  const cols = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 't_neighbours' AND table_name IN ('accounts', 'neighbours')")).map((r) => r.column_name);
  assert.ok(!cols.some((c) => /transcript|message|summary|memory|note$|history/.test(c)), "no memory column");
  await db.query("DELETE FROM accounts WHERE id = $1", [m.id]);
  assert.equal((await db.query("SELECT 1 FROM accounts WHERE id = $1", [m.id])).length, 0);
});
