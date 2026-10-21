import { done, fail, isUuid, requireOrganiser } from "@/lib/http";
import { findById, record } from "@/lib/store";

/** Pauses a member's access: they cannot sign in until an organiser restores it. An organiser cannot pause an organiser. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireOrganiser(req);
  if ("refusal" in r) return r.refusal;
  const { id } = await ctx.params;
  const m = isUuid(id) ? findById(id) : undefined;
  if (!m) return fail(404, "NOT_FOUND");
  if (m.role === "ADMIN") return fail(409, "TARGET_IS_ORGANISER");
  if (m.status === "PAUSED") return fail(409, "ALREADY_PAUSED");
  m.status = "PAUSED";
  record("paused", r.member.email, m.id);
  return done({ paused: true });
}
