import crypto from "node:crypto";

import en from "../messages/en.json";
import fr from "../messages/fr.json";
import { revokeOthers } from "./access";
import { query } from "./db";
import { readEnv } from "./env";
import { sendMail } from "./mail";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

/**
 * Reset and change of the access phrase. A reset link is one use, 30 minutes, kept only as its hash; a reset or a change ends the
 * other sign-ins. `requestReset` is answered the same by the route whether the address has an account or not.
 */
export const RESET_MINUTES = 30;
type Locale = "en" | "fr";
// The e-mail's words are messages like every other text; read here without the page-side i18n engine (the scripts and tests run in plain Node).
const MAIL = { en: en.mail, fr: fr.mail };
const TOKEN = /^yr1\.[A-Za-z0-9_-]{43}$/;

export const newResetToken = () => `yr1.${crypto.randomBytes(32).toString("base64url")}`;
export const isResetToken = (v: unknown): v is string => typeof v === "string" && TOKEN.test(v);
/** The table keeps the hash of a 256-bit random token: a plain SHA-256 is enough. */
export const resetTokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export class PasswordError extends Error {
  constructor(public code: "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG" | "INVALID_TOKEN" | "WRONG_PASSWORD") {
    super(code);
  }
}
const rules = (candidate: string) => {
  const p = passwordProblem(candidate);
  if (p) throw new PasswordError(p === "TOO_SHORT" ? "PASSWORD_TOO_SHORT" : "PASSWORD_TOO_LONG");
};

/** Creates a link for an active account and e-mails it (in the account's language). Returns what happened, for tests: never shown to the caller. */
export async function requestReset(email: string, send: typeof fetch = fetch): Promise<"sent" | "not_configured" | "failed" | "no_account"> {
  const [row] = await query<{ id: string; email: string; locale: Locale }>("SELECT id, email, locale FROM accounts WHERE email = $1 AND status = 'ACTIVE' AND password_hash IS NOT NULL", [email.trim().toLowerCase()]);
  if (!row) return "no_account";
  const base = readEnv().APP_URL?.replace(/\/+$/, "");
  if (!base) return "not_configured";
  const token = newResetToken();
  await query("INSERT INTO password_resets (account_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))", [row.id, resetTokenHash(token), RESET_MINUTES]);
  const m = MAIL[row.locale];
  return sendMail({ to: row.email, subject: m.resetSubject, text: m.resetBody.replace("{url}", `${base}/${row.locale}/reset?token=${encodeURIComponent(token)}`) }, send);
}

/** Sets the new password from a valid link: the link is used up and every sign-in of the account ends. */
export async function resetPassword(token: string, candidate: string): Promise<void> {
  rules(candidate);
  if (!isResetToken(token)) throw new PasswordError("INVALID_TOKEN");
  const hash = await hashPassword(candidate);
  const [row] = await query<{ id: string }>(
    `WITH claimed AS (
       UPDATE password_resets SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING account_id)
     UPDATE accounts SET password_hash = $2
      WHERE id IN (SELECT account_id FROM claimed) AND status = 'ACTIVE'
      RETURNING id`,
    [resetTokenHash(token), hash],
  );
  if (!row) throw new PasswordError("INVALID_TOKEN");
  await revokeOthers(row.id);
}

/** A change while signed in: the current one is asked again; the other sign-ins end, this one stays. */
export async function changePassword(accountId: string, keepCookie: string | undefined, current: string, candidate: string): Promise<void> {
  rules(candidate);
  const [row] = await query<{ password_hash: string | null }>("SELECT password_hash FROM accounts WHERE id = $1", [accountId]);
  if (!row?.password_hash || !(await verifyPassword(current, row.password_hash))) throw new PasswordError("WRONG_PASSWORD");
  await query("UPDATE accounts SET password_hash = $2 WHERE id = $1", [accountId, await hashPassword(candidate)]);
  await revokeOthers(accountId, keepCookie);
}
