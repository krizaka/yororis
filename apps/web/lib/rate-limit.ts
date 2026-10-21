/** A small in-memory limiter per key (one instance): `tooMany` counts a try and says whether the key is over its allowance in the window. */
const tries = new Map<string, { n: number; reset: number }>();
const MAX_KEYS = 1000;

export function tooMany(key: string, allowance: number, windowMs = 15 * 60_000, now = Date.now()): boolean {
  if (tries.size > MAX_KEYS) {
    for (const [k, v] of tries) if (v.reset < now) tries.delete(k);
    if (tries.size > MAX_KEYS) tries.clear();
  }
  const t = tries.get(key);
  if (!t || t.reset < now) tries.set(key, { n: 1, reset: now + windowMs });
  else t.n++;
  return (tries.get(key)?.n ?? 0) > allowance;
}

export const resetLimiter = () => tries.clear();

/** The caller's address behind the platform's proxy (first hop), or "unknown": a key for the limiter, never a decision on its own. */
export const clientKey = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
