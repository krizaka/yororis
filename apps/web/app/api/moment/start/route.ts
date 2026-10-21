import { z } from "zod";

import { done, fail, requireMember } from "@/lib/http";
import { limits } from "@/lib/moment-api";
import { allowance } from "@/lib/moment-policy";
import { begin, liveOf, takenBy } from "@/lib/moments";
import { orazaka,OrazakaError, UPSTREAM_FAILED } from "@/lib/orazaka";
import { presenceOf } from "@/lib/presences";

const Body = z.object({ presence: z.string(), language: z.enum(["en", "fr"]), agreed: z.literal(true) }).strict();

/**
 * Begins a moment with a presence. Refused with a stable code when: nothing is configured (AI_UNAVAILABLE — never a canned
 * answer), the person has not agreed to what is kept (INVALID_PAYLOAD), a moment is already open, or the presence that stops
 * has stopped (STOPS_DAY / STOPS_WEEK, with the time it opens again).
 */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (r.member.consented === false) return fail(403, "CONSENT_REQUIRED");
  const body = Body.safeParse(await req.json().catch(() => null));
  const presence = body.success ? presenceOf(body.data.presence) : undefined;
  if (!body.success || !presence) return fail(400, "INVALID_PAYLOAD");
  const client = orazaka();
  if (!client) return fail(UPSTREAM_FAILED, "AI_UNAVAILABLE");
  if (liveOf(r.member.id)) return fail(409, "MOMENT_OPEN");
  const lim = limits();
  const may = allowance(takenBy(r.member.id), Date.now(), lim);
  if (!may.ok) return Response.json({ success: false, code: may.reason === "DAY" ? "STOPS_DAY" : "STOPS_WEEK", nextAt: new Date(may.nextAt).toISOString() }, { status: 429 });
  try {
    await client.installation();
  } catch (e) {
    return e instanceof OrazakaError ? fail(e.status, e.code) : fail(UPSTREAM_FAILED, "AI_UNAVAILABLE");
  }
  const moment = begin({ memberId: r.member.id, presence: presence.id, language: body.data.language }, lim);
  return done({ moment: { id: moment.id, presence: presence.id, startedAt: new Date(moment.startedAt).toISOString(), endsAt: new Date(moment.endsAt).toISOString() } }, { status: 201 });
}
