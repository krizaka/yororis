import { cookies } from "next/headers";

import { memberOfToken } from "./access";
import { dbConfigured } from "./db";
import { findById, type Member } from "./store";
import { COOKIE, verify } from "./token";

/**
 * The signed-in member behind a cookie value (a paused or deleted member is nobody: re-read on every request). With a database
 * (invited testers) the cookie is a stored token; without one (local run, CI) it is the signed cookie of the fictional cast.
 */
export async function memberOf(cookieValue: string | undefined): Promise<Member | null> {
  if (dbConfigured()) return memberOfToken(cookieValue);
  const id = verify(cookieValue);
  const m = id ? findById(id) : undefined;
  return m && m.status === "ACTIVE" ? m : null;
}

export const cookieOf = (req: Request): string | undefined => /(?:^|;\s*)yororis_auth=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1];

export async function fromRequest(req: Request): Promise<Member | null> {
  return memberOf(cookieOf(req));
}

/** The signed-in member of the page being rendered, or null. */
export async function pageMember(): Promise<Member | null> {
  return memberOf((await cookies()).get(COOKIE)?.value);
}
