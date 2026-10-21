import { z } from "zod";

import { done, fail, isUuid, requireMember } from "@/lib/http";
import { findMoment,finish } from "@/lib/moments";

const Body = z.object({ momentId: z.string().refine(isUuid) }).strict();

/** The person lets everything go: the words of the closed moment are forgotten at once. */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  const moment = findMoment(body.data.momentId, r.member.id);
  if (moment) finish(moment);
  return done({ forgotten: true });
}
