import { NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_DAYS,issueToken } from "@/lib/access";
import { checkPassword } from "@/lib/accounts";
import { dbConfigured } from "@/lib/db";
import { fail } from "@/lib/http";
import { findByEmail, record, touch } from "@/lib/store";
import { cookieHeader, issue, sameOrigin,samePassword } from "@/lib/token";

const Body = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });

const tries = new Map<string, { n: number; reset: number }>();
const MAX_TRIES = 1000;

const tooMany = (key: string) => {
  const now = Date.now();
  if (tries.size > MAX_TRIES) {
    for (const [k, v] of tries) {
      if (v.reset < now) tries.delete(k);
    }
    if (tries.size > MAX_TRIES) tries.clear();
  }
  const t = tries.get(key);
  if (!t || t.reset < now) tries.set(key, { n: 1, reset: now + 15 * 60_000 });
  else t.n++;
  return (tries.get(key)?.n ?? 0) > 10;
};

/** Signs a member in with the e-mail and the demo password: the answer sets an HttpOnly cookie. The same 401 answers a wrong address and a wrong password; 10 tries per address per 15 minutes. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "CROSS_ORIGIN");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "INVALID_PAYLOAD");
  const { email, password } = parsed.data;
  if (tooMany(email.toLowerCase())) return fail(429, "RATE_LIMITED");
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
