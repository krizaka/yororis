import { cookies } from "next/headers";

import { findById, type Member } from "./store";
import { COOKIE, verify } from "./token";

/** The signed-in member behind a cookie value (a paused or deleted member is nobody: re-read on every request). */
export function memberOf(cookieValue: string | undefined): Member | null {
  const id = verify(cookieValue);
  const m = id ? findById(id) : undefined;
  return m && m.status === "ACTIVE" ? m : null;
}

export function fromRequest(req: Request): Member | null {
  const raw = /(?:^|;\s*)yororis_auth=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  return memberOf(raw);
}

/** The signed-in member of the page being rendered, or null. */
export async function pageMember(): Promise<Member | null> {
  return memberOf((await cookies()).get(COOKIE)?.value);
}
