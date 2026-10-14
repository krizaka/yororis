import crypto from "node:crypto";

import { readEnv } from "./env";

/**
 * Sign-in of the member space: a signed cookie (HMAC-SHA256 over the member's id and an expiry), HttpOnly, SameSite=Lax.
 * The demo password is compared in constant time. Pure functions — the Next.js part is lib/auth.ts.
 */
export const COOKIE = "yororis_auth";
const TTL_SECONDS = 60 * 60 * 8;

const sign = (data: string) => crypto.createHmac("sha256", `auth:${readEnv().AUTH_SESSION_SECRET}`).update(data).digest("base64url");

export function issue(memberId: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ sub: memberId, exp: Math.floor(now / 1000) + TTL_SECONDS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verify(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const a = Buffer.from(sign(body));
  const b = Buffer.from(mac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return typeof claims.sub === "string" && typeof claims.exp === "number" && claims.exp * 1000 > now ? claims.sub : null;
  } catch {
    return null;
  }
}

export function samePassword(given: string): boolean {
  const h = (s: string) => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(h(given), h(readEnv().AUTH_DEMO_PASSWORD));
}

export const cookieHeader = (token: string | null) => `${COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? TTL_SECONDS : 0}`;


/** A write must come from this origin (the second lock next to SameSite=Lax). */
export function sameOrigin(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return ["same-origin", "none"].includes(req.headers.get("sec-fetch-site") ?? "");
}
