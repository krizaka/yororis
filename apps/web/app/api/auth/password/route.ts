import { NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_DAYS,issueToken } from "@/lib/access";
import { checkPassword } from "@/lib/accounts";
import { dbConfigured } from "@/lib/db";
import { fail } from "@/lib/http";
import { clientKey, tooMany } from "@/lib/rate-limit";
import { findByEmail, record, touch } from "@/lib/store";
import { cookieHeader, issue, sameOrigin, samePassword } from "@/lib/token";

const Body = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });

/** Signs a member in with the e-mail and the demo password: the answer sets an HttpOnly cookie. The same 401 answers a wrong address and a wrong password; 10 tries per address per 15 minutes. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "CROSS_ORIGIN");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "INVALID_PAYLOAD");
  const { email, password } = parsed.data;
  if (tooMany(`sign-in:${email.toLowerCase()}`, 10) || tooMany(`sign-in-ip:${clientKey(req)}`, 60)) return fail(429, "RATE_LIMITED");
  if (dbConfigured()) {
    const checked = await checkPassword(email, password);
    if (!checked.ok) return checked.reason === "PAUSED" ? fail(403, "PAUSED") : fail(401, "INVALID_CREDENTIALS");
    const res = NextResponse.json({ success: true, member: { id: checked.member.id, role: checked.member.role, locale: checked.member.locale } });
    res.headers.append("Set-Cookie", cookieHeader(await issueToken(checked.member.id), ACCESS_DAYS * 86_400));
    return res;
  }
  const member = findByEmail(email);
  const right = await samePassword(password);
  if (!member || !right) {
    if (member) record("sign_in_refused", member.email, member.id);
    return fail(401, "INVALID_CREDENTIALS");
  }
  if (member.status !== "ACTIVE") {
    record("sign_in_refused", member.email, member.id);
    return fail(403, "PAUSED");
  }
  touch(member);
  record("sign_in", member.email, member.id);
  const res = NextResponse.json({ success: true, member: { id: member.id, role: member.role, locale: member.locale } });
  res.headers.append("Set-Cookie", cookieHeader(issue(member.id)));
  return res;
}
