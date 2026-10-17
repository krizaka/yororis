import { readEnv } from "./env";
import { allowance, type Limits } from "./moment-policy";
import { takenBy } from "./moments";

/** What a spoken turn may carry: Orazaka takes WAV, Ogg/Opus, WebM or MP3, about 30 s, 3 MiB at most (ADR-076). */
export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

/** The limits of the presence that stops, from the environment (defaults: 25 minutes, 1 a day, 3 a week). */
export function limits(): Limits {
  const env = readEnv();
  return { minutes: env.APP_MOMENT_MINUTES, perDay: env.APP_MOMENTS_PER_DAY, perWeek: env.APP_MOMENTS_PER_WEEK };
}

/** When the presence that stopped opens again for this member, or null when a moment may begin. */
export function stopsFor(memberId: string, now = Date.now()): { reason: "DAY" | "WEEK"; nextAt: string } | null {
  const may = allowance(takenBy(memberId), now, limits());
  return may.ok ? null : { reason: may.reason, nextAt: new Date(may.nextAt).toISOString() };
}
