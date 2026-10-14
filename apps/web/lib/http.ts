import { NextResponse } from "next/server";

import { fromRequest } from "./auth";
import type { Member } from "./store";
import { sameOrigin } from "./token";

export const fail = (status: number, code: string) => NextResponse.json({ success: false, code }, { status });
export const done = (body: Record<string, unknown> = {}, init?: ResponseInit) => NextResponse.json({ success: true, ...body }, init);

/** The signed-in member of an API call, or the refusal to answer with. */
export function requireMember(req: Request): { member: Member } | { refusal: NextResponse } {
  if (!sameOrigin(req)) return { refusal: fail(403, "CROSS_ORIGIN") };
  const member = fromRequest(req);
  return member ? { member } : { refusal: fail(401, "UNAUTHENTICATED") };
}

/** The organiser of an API call (ADMIN role), or the refusal. */
export function requireOrganiser(req: Request): { member: Member } | { refusal: NextResponse } {
  const r = requireMember(req);
  if ("refusal" in r) return r;
  return r.member.role === "ADMIN" ? r : { refusal: fail(403, "FORBIDDEN") };
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
