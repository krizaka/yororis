import { z } from "zod";

import { done, fail, isUuid, requireMember } from "@/lib/http";
import { remainingView } from "@/lib/moment-api";
import { updateStat } from "@/lib/moment-stats";
import { close, findMoment,finish } from "@/lib/moments";

const Body = z.object({ momentId: z.string().refine(isUuid), keep: z.boolean().optional() }).strict();

/**
 * Ends the moment. With `keep`, and when there is something to describe, the words wait a few minutes in memory for the person's choice
 * (`/api/moment/keep` to take three lines along, `/api/moment/forget` to let everything go); otherwise they are forgotten now. Nothing is written down.
 */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  const moment = findMoment(body.data.momentId, r.member.id);
  if (!moment) return fail(404, "MOMENT_NOT_FOUND");
  const now = Date.now();
  updateStat(moment.statId, { outcome: now >= moment.endsAt ? "over" : "closed", endedAt: now });
  const canKeep = body.data.keep === true && moment.log.length >= 2;
  if (canKeep) close(moment);
  else finish(moment);
  return done({ canKeep, remaining: remainingView(r.member.id) });
}
