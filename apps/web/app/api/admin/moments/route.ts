import { z } from "zod";

import { done, fail, requireOrganiser } from "@/lib/http";
import { listStats, summarise } from "@/lib/moment-stats";

const Query = z.object({
  outcome: z.string().transform((s) => s.split(",").filter(Boolean)).optional(),
  sort: z.enum(["hour", "durationSec", "turns", "outcome"]).default("hour"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * The moments, as counts: when (to the hour), which presence, language, duration, turns, how it ended, whether the lines to call were shown, whether
 * lines were kept. Never a word, never a name. Organisers only.
 */
export async function GET(req: Request) {
  const r = requireOrganiser(req);
  if ("refusal" in r) return r.refusal;
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return fail(400, "INVALID_PAYLOAD");
  const { rows, total } = listStats(q.data);
  return done({ rows, total, summary: summarise() });
}
