import { z } from "zod";

import { done, fail, requireOrganiser } from "@/lib/http";
import { listMembers } from "@/lib/store";

const Query = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.string().transform((s) => s.split(",").filter(Boolean)).optional(),
  sort: z.enum(["name", "createdAt", "lastSeenAt", "status"]).default("createdAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
});

/** The organisation's members: searched, filtered by status, sorted and paged on the server. Organisers only. */
export async function GET(req: Request) {
  const r = requireOrganiser(req);
  if ("refusal" in r) return r.refusal;
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return fail(400, "INVALID_PAYLOAD");
  const { rows, total } = listMembers(q.data);
  return done({ rows: rows.map(({ id, email, name, status, role, locale, createdAt, lastSeenAt }) => ({ id, email, name, status, role, locale, createdAt, lastSeenAt })), total });
}
