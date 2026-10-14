import { isKrizakaApiError } from "@krizaka/query";

/** The catalogue key (under `console.errors`) that words a failed call: the server's stable `code`, else its status. */
export function errorKey(error: unknown): string {
  if (!isKrizakaApiError(error)) return "generic";
  const code = (error.body as { code?: unknown } | undefined)?.code;
  if (typeof code === "string") return code;
  if (error.status === 0) return "network";
  if (error.status === 429) return "RATE_LIMITED";
  if (error.status === 401) return "UNAUTHENTICATED";
  return "generic";
}
