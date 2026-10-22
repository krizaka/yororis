import { dbConfigured } from "@/lib/db";
import { done, fail, requireMember } from "@/lib/http";
import { goSeeAnother } from "@/lib/neighbours";

import { view } from "../route";

/** « Aller voir un autre voisin »: at most once a day (light, and cheap). The refusal says when it opens again. */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (!dbConfigured()) return fail(404, "NOT_AVAILABLE");
  const went = await goSeeAnother(r.member.id, Date.now(), Math.random);
  if (went.ok) return done({ neighbour: view(went.neighbour) });
  if (went.reason === "ONCE_A_DAY") return Response.json({ success: false, code: "ONCE_A_DAY", nextAt: new Date(went.nextAt).toISOString() }, { status: 429 });
  return fail(404, "NOT_FOUND");
}
