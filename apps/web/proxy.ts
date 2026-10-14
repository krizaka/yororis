import { type NextRequest, NextResponse } from "next/server";

/** An address without a language goes to the reader's (cookie, then Accept-Language, else English). The API never passes here. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  if (segment === "en" || segment === "fr") return;
  const chosen = request.cookies.get("NEXT_LOCALE")?.value;
  const first = (request.headers.get("accept-language") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const locale = chosen === "en" || chosen === "fr" ? chosen : first.startsWith("fr") ? "fr" : "en";
  return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url));
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"] };
