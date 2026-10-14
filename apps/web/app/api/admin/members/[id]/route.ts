import { done, fail, isUuid, requireOrganiser } from "@/lib/http";
import { auditFor, findById } from "@/lib/store";

/** One member for an organiser: state, role, language and the lines about them. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = requireOrganiser(req);
  if ("refusal" in r) return r.refusal;
  const { id } = await ctx.params;
  const m = isUuid(id) ? findById(id) : undefined;
  return m ? done({ member: m, activity: auditFor(m.id) }) : fail(404, "NOT_FOUND");
}
