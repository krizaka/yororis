import { type NextRequest, NextResponse } from "next/server";

/** The host that is the development environment: it serves no page, and says so to the crawlers that reach its few paths. */
export const DEV_HOST = "dev.yororis.com";

/** The public pages are the static home (rewritten in next.config.mjs): the home (English at `/`), the changelog. */
const PUBLIC = /^\/(changelog\/?)?$/;

/** What the development host answers itself; every other path is sent to www (App Platform cannot route by pattern: it is done here). */
export const DEV_OPEN = /^\/(api(\/|$)|\.well-known(\/|$)|robots\.txt$)/;
export const WWW_ORIGIN = "https://www.yororis.com";

const ROBOTS_DEV = "User-agent: *\nDisallow: /\n";

/**
 * An address of the member space without a language goes to the reader's (cookie, then Accept-Language, else English). The public
 * pages and the API never pass here. On the development host robots.txt shuts the door.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const dev = request.headers.get("host")?.split(":")[0] === DEV_HOST;
  if (dev && !DEV_OPEN.test(pathname)) return NextResponse.redirect(`${WWW_ORIGIN}${pathname}${search}`, 308);
  if (pathname === "/robots.txt" && dev) {
    return new NextResponse(ROBOTS_DEV, { headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow" } });
  }
  if (dev && DEV_OPEN.test(pathname) && pathname !== "/robots.txt") return; // the API and /.well-known (the matcher lets them through on the dev host)
  if (pathname === "/robots.txt" || PUBLIC.test(pathname)) return;
  const segment = pathname.split("/")[1];
  if (segment === "en" || segment === "fr") return;
  const chosen = request.cookies.get("NEXT_LOCALE")?.value;
  const first = (request.headers.get("accept-language") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const locale = chosen === "en" || chosen === "fr" ? chosen : first.startsWith("fr") ? "fr" : "en";
  return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url));
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)", "/robots.txt", { source: "/:path*", has: [{ type: "host", value: "dev.yororis.com" }] }] }; // a literal: the matcher is read statically
