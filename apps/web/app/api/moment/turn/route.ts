import { z } from "zod";

import { done, fail, isUuid, requireMember } from "@/lib/http";
import { limits } from "@/lib/moment-api";
import { isNearlyOver, isOver } from "@/lib/moment-policy";
import { contextOf, findMoment, finish, MAX_TURNS, remember } from "@/lib/moments";
import { orazaka,OrazakaError } from "@/lib/orazaka";
import { presenceOf } from "@/lib/presences";

const Body = z.object({ momentId: z.string().refine(isUuid), text: z.string().trim().min(1).max(2000) }).strict();

/**
 * One turn of the moment: the person's words go to Orazaka's wellbeing pack, and what comes back is what is shown — the
 * answer sentence by sentence, or the pack's fixed crisis reply (`crisis`), or the pack's own words when it declines a subject
 * (`declined`). Bounded on the server: only the owner, only before the moment's end, one turn at a time, a bounded number.
 */
export async function POST(req: Request) {
  const r = requireMember(req);
  if ("refusal" in r) return r.refusal;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(400, "INVALID_PAYLOAD");
  const moment = findMoment(body.data.momentId, r.member.id);
  if (!moment || moment.ended) return fail(404, "MOMENT_NOT_FOUND");
  const lim = limits();
  const now = Date.now();
  if (isOver(moment.startedAt, now, lim) || moment.turns >= MAX_TURNS) return fail(409, "MOMENT_OVER");
  const client = orazaka();
  if (!client) return fail(503, "AI_UNAVAILABLE");
  if (moment.busy) return fail(429, "RATE_LIMITED");
  const presence = presenceOf(moment.presence);
  if (!presence) return fail(404, "MOMENT_NOT_FOUND");
  moment.busy = true;
  try {
    const turn = await client.turn({ conversationId: moment.conversationId, text: body.data.text, locale: presence.tags[moment.language], voice: presence.voices[moment.language], context: contextOf(moment) });
    moment.turns += 1;
    // The pack's fixed reply ends the moment: the presence stops performing and nothing more is said to it. Its words are not remembered.
    if (turn.crisis) finish(moment);
    else remember(moment, body.data.text, turn.sentences.map((s) => s.text).join(" "));
    return done({ turn: { sentences: turn.sentences.map((s) => ({ index: s.index, text: s.text })), crisis: turn.crisis ? { text: turn.crisis.text, resource: turn.crisis.resource } : null, declined: turn.declined ? { text: turn.declined.text } : null }, nearlyOver: isNearlyOver(moment.startedAt, Date.now(), lim) });
  } catch (e) {
    return e instanceof OrazakaError ? fail(e.status, e.code) : fail(503, "AI_UNAVAILABLE");
  } finally {
    moment.busy = false;
  }
}
