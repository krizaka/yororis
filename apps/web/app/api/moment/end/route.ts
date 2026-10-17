import { z } from "zod";

import { done, fail, isUuid, requireMember } from "@/lib/http";
import { findMoment,finish } from "@/lib/moments";

const Body = z.object({ momentId: z.string().refine(isUuid) }).strict();

/** Ends the moment. Yororis keeps nothing of what was said: the moment is forgotten here, the words stay on the person's screen until they leave it. */
export async function POST(req: Request) {
  const r = requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  const moment = findMoment(body.data.momentId, r.member.id);
  if (!moment) return fail(404, "MOMENT_NOT_FOUND");
  finish(moment);
  return done({ kept: 0 });
}
