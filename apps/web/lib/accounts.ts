import crypto from "node:crypto";

import { query } from "./db";
import { decoyHash, hashPassword, passwordProblem, verifyPassword } from "./password";
import type { Member } from "./store";
import { TERMS_VERSION } from "./terms";

/**
 * The invited testers' accounts (docs/FRAMEWORK.md §5, « lawyers OK in principle, 2026-10-21, invited testers only »): e-mail,
 * password hash, profile, avatar. Nobody signs up: accounts are provisioned by an operator (scripts/provision-testers.mjs).
 * A wrong address and a wrong password get the same refusal after the same work; a paused account is refused only once its
 * password is right, so the refusal tells a stranger nothing.
 */
export const ORGANISATION_TESTERS = "Invited testers";

interface Row {
  id: string;
  email: string;
  name: string;
  locale: "en" | "fr";
  role: "MEMBER" | "ADMIN";
  status: "ACTIVE" | "PAUSED";
  subtitles: boolean;
  calm_motion: boolean;
  avatar: string | null;
  created_at: Date;
  last_seen_at: Date | null;
  consented_at: Date | null;
  terms_version: string | null;
}
const COLUMNS = "id, email, name, locale, role, status, subtitles, calm_motion, avatar, created_at, last_seen_at, consented_at, terms_version";

export const toMember = (r: Row): Member => ({
  id: r.id,
  email: r.email,
  name: r.name,
  organisation: ORGANISATION_TESTERS,
  role: r.role,
  status: r.status,
  locale: r.locale,
  subtitles: r.subtitles,
  calmMotion: r.calm_motion,
  avatar: r.avatar,
  consented: !!r.consented_at && r.terms_version === TERMS_VERSION,
  createdAt: r.created_at.toISOString(),
  lastSeenAt: r.last_seen_at?.toISOString() ?? null,
});

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export async function accountById(id: string): Promise<Member | null> {
  const [row] = await query<Row>(`SELECT ${COLUMNS} FROM accounts WHERE id = $1`, [id]);
  return row ? toMember(row) : null;
}

export async function accountByEmail(email: string): Promise<Member | null> {
  const [row] = await query<Row>(`SELECT ${COLUMNS} FROM accounts WHERE email = $1`, [normaliseEmail(email)]);
  return row ? toMember(row) : null;
}

export type CheckResult = { ok: true; member: Member } | { ok: false; reason: "INVALID_CREDENTIALS" | "PAUSED" };

/** Checks an e-mail and a password. Always does the same hashing work, whether the address exists or not. */
export async function checkPassword(email: string, password: string): Promise<CheckResult> {
  const [row] = await query<Row & { password_hash: string | null }>(`SELECT ${COLUMNS}, password_hash FROM accounts WHERE email = $1`, [normaliseEmail(email)]);
  const right = await verifyPassword(password, row?.password_hash ?? (await decoyHash()));
  if (!row || !row.password_hash || !right) return { ok: false, reason: "INVALID_CREDENTIALS" };
  if (row.status !== "ACTIVE") return { ok: false, reason: "PAUSED" };
  await query("UPDATE accounts SET last_seen_at = now() WHERE id = $1", [row.id]);
  return { ok: true, member: toMember(row) };
}

export interface NewAccount {
  email: string;
  name: string;
  password: string;
  locale?: "en" | "fr";
  role?: "MEMBER" | "ADMIN";
}

/** The operator's door (never a route): creates an invited tester's account, or refuses a weak password or a taken address. */
export async function provisionAccount(a: NewAccount): Promise<Member> {
  const problem = passwordProblem(a.password);
  if (problem) throw new Error(`password ${problem}`);
  const [row] = await query<Row>(
    `INSERT INTO accounts (email, name, password_hash, locale, role) VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
    [normaliseEmail(a.email), a.name.trim(), await hashPassword(a.password), a.locale ?? "en", a.role ?? "MEMBER"],
  );
  return toMember(row!);
}

export const generatePassword = () => crypto.randomBytes(18).toString("base64url");
