import { NextResponse } from "next/server";

import { fail } from "@/lib/http";
import { cookieHeader, sameOrigin } from "@/lib/token";

/** Signs the member out: the cookie is cleared. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "CROSS_ORIGIN");
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", cookieHeader(null));
  return res;
}
