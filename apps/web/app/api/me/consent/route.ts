import { z } from "zod";

import { dbConfigured } from "@/lib/db";
import { done, fail, requireMember } from "@/lib/http";
import { recordConsent } from "@/lib/profile";

const Body = z.object({ adult: z.literal(true), terms: z.literal(true) }).strict();

/** The first sign-in's one question: 18 or older, and the terms. Both boxes, or nothing is recorded (only the date and the version are kept). */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (!Body.safeParse(await req.json().catch(() => null)).success) return fail(400, "INVALID_PAYLOAD");
  if (dbConfigured()) await recordConsent(r.member.id);
  return done();
}
