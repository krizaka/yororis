import { z } from "zod";

import { done, fail, isUuid, requireMember } from "@/lib/http";
import { updateStat } from "@/lib/moment-stats";
import { findMoment, finish, turnsOf } from "@/lib/moments";
import { orazaka, OrazakaError, UPSTREAM_FAILED } from "@/lib/orazaka";

/** A line after the words, in the person's language: the Studio's own instructions are French and, on a small model, would otherwise win over `locale`. */
const DIRECTIVE = { en: "(Write every value of the JSON in English.)", fr: "(Écris toutes les valeurs du JSON en français.)" } as const;

const Body = z.object({ momentId: z.string().refine(isUuid), moodBefore: z.number().int().min(1).max(5).optional(), moodAfter: z.number().int().min(1).max(5).optional() }).strict();

/**
 * What the person keeps: the pack's Studio describes the moment from their own words (themes, what helped, a small step, what to take along).
 * It is shown to them to read, edit or drop; it is stored nowhere here, and the moment's words are forgotten as soon as it has been written.
 * The two numbers are the person's own: they go in as given, never computed.
 */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  const moment = findMoment(body.data.momentId, r.member.id);
  if (!moment || !moment.ended || moment.log.length < 2) return fail(404, "MOMENT_NOT_FOUND");
  const client = orazaka();
  if (!client) return fail(UPSTREAM_FAILED, "AI_UNAVAILABLE");
  if (moment.busy) return fail(429, "RATE_LIMITED");
  moment.busy = true;
  try {
    const kept = await client.keep({ turns: `${turnsOf(moment)}\n\n${DIRECTIVE[moment.language]}`, locale: moment.language === "fr" ? "fr-CA" : "en", moodBefore: body.data.moodBefore, moodAfter: body.data.moodAfter });
    updateStat(moment.statId, { kept: true });
    finish(moment);
    return done({ kept });
  } catch (e) {
    return e instanceof OrazakaError ? fail(e.status, e.code) : fail(UPSTREAM_FAILED, "AI_UNAVAILABLE");
  } finally {
    moment.busy = false;
  }
}
