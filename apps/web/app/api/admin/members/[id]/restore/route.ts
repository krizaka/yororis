import { done, fail, isUuid, requireOrganiser } from "@/lib/http";
import { findById, record } from "@/lib/store";

/** Restores a paused member's access. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = requireOrganiser(req);
  if ("refusal" in r) return r.refusal;
  const { id } = await ctx.params;
  const m = isUuid(id) ? findById(id) : undefined;
  if (!m) return fail(404, "NOT_FOUND");
  if (m.status !== "PAUSED") return fail(409, "NOT_PAUSED");
  m.status = "ACTIVE";
  record("restored", r.member.email, m.id);
  return done({ restored: true });
}
