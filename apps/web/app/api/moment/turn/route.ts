import { z } from "zod";

import { detectCrisis } from "@/lib/crisis";
import { readEnv } from "@/lib/env";
import { done, fail, isUuid, requireMember } from "@/lib/http";
import { limits, MAX_AUDIO_BYTES, remainingView } from "@/lib/moment-api";
import { isNearlyOver, isOver } from "@/lib/moment-policy";
import { updateStat } from "@/lib/moment-stats";
import { contextOf, findMoment, finish, remember } from "@/lib/moments";
import { clipHref, orazaka, OrazakaError, type TurnInput, UPSTREAM_FAILED } from "@/lib/orazaka";
import { presenceOf } from "@/lib/presences";

import en from "../../../../messages/en.json";
import fr from "../../../../messages/fr.json";

/** The fixed text shown when the cut-off fires: written once in the messages, never generated, never rephrased. */
/** The neighbour's persona (messages `console.persona.system`): the caller's context of every turn starts with it (the pack's own system prompt is the engine's). */
const PERSONA = { en: en.console.persona.system, fr: fr.console.persona.system };
const FIXED = { en: en.console.moment.crisisFixed, fr: fr.console.moment.crisisFixed };

const Text = z.object({ momentId: z.string().refine(isUuid), text: z.string().trim().min(1).max(2000) }).strict();

const AUDIO_TYPES = /^audio\/(wav|x-wav|wave|ogg|webm|mpeg|mp3)(;|$)/i;

type Said = { momentId: string; input: Pick<TurnInput, "text" | "audio">; typed: string | null } | { refusal: Response };

/** The turn's words: typed (JSON) or spoken (multipart, one `audio` part). */
async function said(req: Request): Promise<Said> {
  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    if (readEnv().APP_VOICE_TURNS !== "on") return { refusal: fail(415, "VOICE_OFF") };
    const form = await req.formData().catch(() => null);
    const momentId = form?.get("momentId");
    const audio = form?.get("audio");
    if (typeof momentId !== "string" || !isUuid(momentId) || !(audio instanceof Blob)) return { refusal: fail(400, "INVALID_PAYLOAD") };
    if (audio.size === 0) return { refusal: fail(400, "INVALID_PAYLOAD") };
    if (audio.size > MAX_AUDIO_BYTES) return { refusal: fail(413, "AUDIO_TOO_LONG") };
    if (!AUDIO_TYPES.test(audio.type)) return { refusal: fail(415, "AUDIO_TYPE") };
    return { momentId, input: { audio }, typed: null };
  }
  const body = Text.safeParse(await req.json().catch(() => null));
  if (!body.success) return { refusal: fail(400, "INVALID_PAYLOAD") };
  return { momentId: body.data.momentId, input: { text: body.data.text }, typed: body.data.text };
}

/**
 * One turn of the moment: the person's words (typed, or spoken and transcribed by Orazaka) go to the wellbeing pack, and what
 * comes back is what is shown — the answer sentence by sentence, each with its voice, or the pack's fixed crisis reply
 * (`crisis`), or the pack's own words when it declines a subject (`declined`). Bounded on the server: only the owner, only
 * before the moment's end, one turn at a time, a bounded number, a bounded recording.
 */
export async function POST(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const heard = await said(req);
  if ("refusal" in heard) return heard.refusal;
  const moment = findMoment(heard.momentId, r.member.id);
  if (!moment || moment.ended) return fail(404, "MOMENT_NOT_FOUND");
  const lim = limits();
  const now = Date.now();
  if (isOver(moment.startedAt, now, lim) || moment.turns >= lim.turns) return fail(409, "MOMENT_OVER");
  // The cut-off: before the model, on what was typed. The moment stops at once; the text is fixed; nothing of the input is kept, logged or counted.
  if (heard.typed !== null && detectCrisis(heard.typed)) {
    updateStat(moment.statId, { outcome: "lines", lines: true, endedAt: Date.now() });
    const language = moment.language;
    finish(moment);
    return done({ turn: { heard: null, sentences: [], crisis: { text: FIXED[language], resource: null }, declined: null, closing: false }, nearlyOver: false });
  }
  const client = orazaka();
  if (!client) return fail(UPSTREAM_FAILED, "AI_UNAVAILABLE");
  if (moment.busy) return fail(429, "RATE_LIMITED");
  const presence = presenceOf(moment.presence);
  if (!presence) return fail(404, "MOMENT_NOT_FOUND");
  moment.busy = true;
  try {
    const turn = await client.turn({ ...heard.input, conversationId: moment.conversationId, locale: presence.tags[moment.language], voice: presence.voices[moment.language], context: `${PERSONA[moment.language]}${moment.profile ? `\n${moment.profile}` : ""}\n${contextOf(moment)}` });
    moment.turns += 1;
    // The last turn: the neighbour has to go. The answer is shown, then the moment is over and forgotten; no more model call.
    const closing = !turn.crisis && moment.turns >= lim.turns;
    const person = heard.typed ?? turn.transcript ?? "";
    // The pack's fixed reply ends the moment: the presence stops performing and nothing more is said to it. Its words are not remembered.
    updateStat(moment.statId, { turns: moment.turns });
    if (turn.crisis) {
      updateStat(moment.statId, { outcome: "lines", lines: true, endedAt: Date.now() });
      finish(moment);
    }
    else if (closing) {
      updateStat(moment.statId, { outcome: "closed", endedAt: Date.now() });
      finish(moment);
    } else if (person) remember(moment, person, turn.sentences.map((s) => s.text).join(" "));
    return done({
      turn: {
        closing,
        ...(closing ? { remaining: remainingView(r.member.id) } : {}),
        heard: heard.typed === null ? person : null,
        sentences: turn.sentences.map((s) => ({ index: s.index, text: s.text, voice: s.audio ? { clip: clipHref(s.audio.url), durationMs: s.audio.durationMs ?? null } : null })),
        crisis: turn.crisis ? { text: turn.crisis.text, resource: turn.crisis.resource, voice: turn.crisis.audio ? { clip: clipHref(turn.crisis.audio.url), durationMs: turn.crisis.audio.durationMs ?? null } : null } : null,
        declined: turn.declined ? { text: turn.declined.text, voice: turn.declined.audio ? { clip: clipHref(turn.declined.audio.url), durationMs: turn.declined.audio.durationMs ?? null } : null } : null,
      },
      nearlyOver: isNearlyOver(moment.startedAt, Date.now(), lim),
    });
  } catch (e) {
    return e instanceof OrazakaError ? fail(e.status, e.code) : fail(UPSTREAM_FAILED, "AI_UNAVAILABLE");
  } finally {
    moment.busy = false;
  }
}
