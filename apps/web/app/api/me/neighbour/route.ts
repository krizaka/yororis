import { dbConfigured } from "@/lib/db";
import { done, fail, requireMember } from "@/lib/http";
import { current, type Neighbour } from "@/lib/neighbours";

/** What the screen needs of a neighbour: a name, a band and one line. Nothing of the profile. */
export const view = (n: Neighbour) => ({ id: n.id, name: n.name, band: n.band, line: n.line });

/** The member's neighbour now (a rotation that came due has happened), and the warm note of a move until it is read. */
export async function GET(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (!dbConfigured()) return fail(404, "NOT_AVAILABLE");
  const c = await current(r.member.id, Date.now(), Math.random);
  if (!c) return fail(404, "NOT_FOUND");
  return done({ neighbour: view(c.neighbour), moved: c.moved ? { from: view(c.moved.from), to: view(c.moved.to) } : null });
}
