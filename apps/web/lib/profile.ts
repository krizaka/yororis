import { accountById } from "./accounts";
import { query } from "./db";
import type { Member } from "./store";
import { TERMS_VERSION } from "./terms";

export interface ProfilePatch {
  name?: string;
  locale?: "en" | "fr";
  subtitles?: boolean;
  calmMotion?: boolean;
  avatar?: string | null;
}

const COLUMN: Record<keyof ProfilePatch, string> = { name: "name", locale: "locale", subtitles: "subtitles", calmMotion: "calm_motion", avatar: "avatar" };

/** Changes what a tester says about themselves: name, language, the two display choices, the chosen avatar. */
export async function updateProfile(id: string, patch: ProfilePatch): Promise<Member | null> {
  const keys = (Object.keys(patch) as (keyof ProfilePatch)[]).filter((k) => k in COLUMN && patch[k] !== undefined);
  if (keys.length) {
    await query(`UPDATE accounts SET ${keys.map((k, i) => `${COLUMN[k]} = $${i + 2}`).join(", ")} WHERE id = $1`, [id, ...keys.map((k) => patch[k])]);
  }
  return accountById(id);
}

/** Deletes the account at once: its sign-ins and reset links go with it (cascade). */
export async function deleteAccount(id: string): Promise<boolean> {
  return (await query("DELETE FROM accounts WHERE id = $1 RETURNING id", [id])).length > 0;
}

/** Records the first sign-in's consent (18 or older, the terms): only the date and the version of the terms. */
export async function recordConsent(id: string): Promise<void> {
  await query("UPDATE accounts SET consented_at = now(), terms_version = $2 WHERE id = $1", [id, TERMS_VERSION]);
}
