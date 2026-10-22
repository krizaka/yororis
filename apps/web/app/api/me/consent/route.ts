import { z } from "zod";

import { dbConfigured } from "@/lib/db";
import { done, fail, requireMember } from "@/lib/http";
import { assign, BANDS } from "@/lib/neighbours";
import { recordConsent } from "@/lib/profile";

// The band is self-declared and coarse (Law 25 minimisation): never a birth date. Strict: any other field is refused.
const Body = z.object({ adult: z.literal(true), terms: z.literal(true), ageBand: z.enum(BANDS).optional() }).strict();

/** The first sign-in's one question: 18 or older, the terms and an age band. Everything or nothing is recorded; then a neighbour is assigned within the band. */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  if (dbConfigured()) {
    if (!body.data.ageBand) return fail(400, "INVALID_PAYLOAD");
    await recordConsent(r.member.id);
    await assign(r.member.id, body.data.ageBand, Date.now(), Math.random);
  }
  return done();
}
