import { dbConfigured } from "@/lib/db";
import { done, requireMember } from "@/lib/http";
import { seen } from "@/lib/neighbours";

/** The member has read the note of a move: it is not shown again. */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (dbConfigured()) await seen(r.member.id);
  return done();
}
