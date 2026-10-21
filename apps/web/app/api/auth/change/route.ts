import { z } from "zod";

import { cookieOf } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { done, fail, requireMember } from "@/lib/http";
import { tooMany } from "@/lib/rate-limit";
import { changePassword, PasswordError } from "@/lib/reset";

const Body = z.object({ current: z.string().min(1).max(300), password: z.string().min(1).max(300) });

/** Changes the signed-in member's password (the current one is asked again). The other sign-ins end. 10 tries per member per 15 minutes. */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (!dbConfigured()) return fail(404, "NOT_AVAILABLE");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "INVALID_PAYLOAD");
  if (tooMany(`change:${r.member.id}`, 10)) return fail(429, "RATE_LIMITED");
  try {
    await changePassword(r.member.id, cookieOf(req), parsed.data.current, parsed.data.password);
    return done();
  } catch (error) {
    if (error instanceof PasswordError) return fail(400, error.code);
    throw error;
  }
}
