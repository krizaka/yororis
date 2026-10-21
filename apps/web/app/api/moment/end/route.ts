import { z } from "zod";

import { done, fail, isUuid, requireMember } from "@/lib/http";
import { remainingView } from "@/lib/moment-api";
import { updateStat } from "@/lib/moment-stats";
import { findMoment, finish } from "@/lib/moments";

const Body = z.object({ momentId: z.string().refine(isUuid) }).strict();

/** Ends the moment: what was said is forgotten at once. Nothing is written down, nothing is described, nothing is taken away. */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  const moment = findMoment(body.data.momentId, r.member.id);
  if (!moment) return fail(404, "MOMENT_NOT_FOUND");
  const now = Date.now();
  updateStat(moment.statId, { outcome: now >= moment.endsAt ? "over" : "closed", endedAt: now });
  finish(moment);
  return done({ remaining: remainingView(r.member.id) });
}
