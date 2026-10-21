import { z } from "zod";

import { dbConfigured } from "@/lib/db";
import { done, fail } from "@/lib/http";
import { clientKey, tooMany } from "@/lib/rate-limit";
import { PasswordError, resetPassword } from "@/lib/reset";
import { sameOrigin } from "@/lib/token";

const Body = z.object({ token: z.string().max(100), password: z.string().min(1).max(300) });

/** Sets a new password from the e-mailed link (one use). 20 tries per caller per 15 minutes. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "CROSS_ORIGIN");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "INVALID_PAYLOAD");
  if (!dbConfigured()) return fail(404, "NOT_AVAILABLE");
  if (tooMany(`reset-ip:${clientKey(req)}`, 20)) return fail(429, "RATE_LIMITED");
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return done();
  } catch (error) {
    if (error instanceof PasswordError) return fail(400, error.code);
    throw error;
  }
}
