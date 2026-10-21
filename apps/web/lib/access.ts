import crypto from "node:crypto";

import { accountById } from "./accounts";
import { query } from "./db";
import { readEnv } from "./env";
import type { Member } from "./store";

/**
 * The invited testers' sign-in cookie: a random token (`ya1.` + 32 bytes); the table keeps only its keyed hash, so a leaked table
 * opens nothing. The account is re-read on every request (a pause applies at once). 7 days, HttpOnly, SameSite=Lax.
 */
export const ACCESS_DAYS = 7;
const TOKEN = /^ya1\.[A-Za-z0-9_-]{43}$/;

export const newToken = () => `ya1.${crypto.randomBytes(32).toString("base64url")}`;
export const isToken = (value: string | undefined): value is string => !!value && TOKEN.test(value);
export const tokenHash = (token: string, secret = readEnv().AUTH_SESSION_SECRET) => crypto.createHmac("sha256", `access:${secret}`).update(token).digest("hex");

export async function issueToken(accountId: string): Promise<string> {
  const token = newToken();
  await query("INSERT INTO access_tokens (account_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))", [accountId, tokenHash(token), ACCESS_DAYS]);
  return token;
}

/** The active member behind a token, or null (unknown, expired, paused). */
export async function memberOfToken(token: string | undefined): Promise<Member | null> {
  if (!isToken(token)) return null;
  const [row] = await query<{ account_id: string }>("SELECT account_id FROM access_tokens WHERE token_hash = $1 AND expires_at > now()", [tokenHash(token)]);
  if (!row) return null;
  const m = await accountById(row.account_id);
  return m && m.status === "ACTIVE" ? m : null;
}

export async function revokeToken(token: string | undefined): Promise<void> {
  if (isToken(token)) await query("DELETE FROM access_tokens WHERE token_hash = $1", [tokenHash(token)]);
}

/** Ends every sign-in of an account but the one holding `keep` (a password change or reset). */
export async function revokeOthers(accountId: string, keep?: string): Promise<void> {
  await query("DELETE FROM access_tokens WHERE account_id = $1 AND ($2::text IS NULL OR token_hash <> $2)", [accountId, isToken(keep) ? tokenHash(keep) : null]);
}
