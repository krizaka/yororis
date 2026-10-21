import { z } from "zod";

import { dbConfigured } from "@/lib/db";
import { done, fail } from "@/lib/http";
import { clientKey, tooMany } from "@/lib/rate-limit";
import { requestReset } from "@/lib/reset";
import { sameOrigin } from "@/lib/token";

const Body = z.object({ email: z.string().trim().email().max(254) });

/** Asks for a link to choose a new password. The answer is the same whether the address has an account or not (and whether the e-mail could be sent). 5 per address and 20 per caller per 15 minutes. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "CROSS_ORIGIN");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "INVALID_PAYLOAD");
  const email = parsed.data.email.toLowerCase();
  if (tooMany(`forgot:${email}`, 5) || tooMany(`forgot-ip:${clientKey(req)}`, 20)) return fail(429, "RATE_LIMITED");
  if (dbConfigured()) await requestReset(email);
  return done();
}
