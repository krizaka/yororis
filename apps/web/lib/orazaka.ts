import { z } from "zod";

import { readEnv } from "./env";

/**
 * Orazaka's edge — the only place a moment is answered. Yororis sends the person's words (text now, audio later) to the
 * wellbeing pack's voice turn and renders what comes back: the answer sentence by sentence, or the pack's fixed crisis
 * reply, or the pack's refusal. No model is ever called from here (tests/no-direct-model.test.mjs), and the crisis text is
 * never generated nor rephrased here: it is shown as Orazaka sent it (ADR-076).
 *
 *   POST /api/v1/voice/turns   multipart: text | audio, conversationId, locale, voice, installationId → SSE
 *   GET  /api/v1/studios/installations            the Studios this account installed
 *   POST /api/v1/studios/guided-journaling/installations   install the wellbeing pack once, with the consent it asks for
 */
type Fetch = typeof fetch;

const Resource = z.object({ region: z.string(), label: z.string(), contact: z.string(), availability: z.string(), sourceUrl: z.string(), verifiedOn: z.string() });
const Audio = z.object({ url: z.string(), durationMs: z.number().optional(), contentType: z.string().optional(), voice: z.string().optional(), locale: z.string().optional() });
const Sentence = z.object({ index: z.number(), text: z.string(), audio: Audio.optional() });
const Crisis = z.object({ response: z.string().optional(), text: z.string(), resource: Resource.optional(), audio: Audio.optional() });
const Refused = z.object({ refusal: z.string().optional(), text: z.string().optional(), audio: Audio.optional() });

export interface Turn {
  transcript: string | null;
  sentences: { index: number; text: string; audio: z.infer<typeof Audio> | null }[];
  /** The pack's fixed reply, as sent. Present = the presence stops performing and the lines are shown. */
  crisis: { text: string; resource: z.infer<typeof Resource> | null; audio: z.infer<typeof Audio> | null } | null;
  /** The pack declined the subject (a question for a professional): its own words. */
  declined: { text: string; audio: z.infer<typeof Audio> | null } | null;
}

/** A refusal in terms Yororis words: a stable code and the HTTP status to answer with. */
export class OrazakaError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function refusalOf(status: number): OrazakaError {
  if (status === 451) return new OrazakaError(409, "CONSENT");
  if (status === 402) return new OrazakaError(503, "AI_UNAVAILABLE");
  if (status === 403 || status === 401) return new OrazakaError(502, "AI_KEY");
  if (status === 422) return new OrazakaError(422, "NO_VOICE");
  if (status === 400) return new OrazakaError(400, "INVALID_PAYLOAD");
  return new OrazakaError(503, "AI_UNAVAILABLE");
}

/** Reads the SSE body of a voice turn. An unknown event is ignored; a malformed one makes the turn fail rather than guess. */
export function parseTurn(body: string): Turn {
  const turn: Turn = { transcript: null, sentences: [], crisis: null, declined: null };
  for (const block of body.split(/\r?\n\r?\n/)) {
    let name = "message";
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) continue;
    let json: unknown;
    try {
      json = JSON.parse(data.join("\n"));
    } catch {
      throw new OrazakaError(502, "AI_SHAPE");
    }
    if (name === "transcript") turn.transcript = z.object({ text: z.string() }).parse(json).text;
    else if (name === "sentence") {
      const s = Sentence.parse(json);
      turn.sentences.push({ index: s.index, text: s.text, audio: s.audio ?? null });
    } else if (name === "safety.crisis") {
      const c = Crisis.parse(json);
      turn.crisis = { text: c.text, resource: c.resource ?? null, audio: c.audio ?? null };
    } else if (name === "scope.refused") {
      const r = Refused.parse(json);
      turn.declined = { text: r.text ?? r.refusal ?? "", audio: r.audio ?? null };
    } else if (name === "error") throw new OrazakaError(502, "AI_UNAVAILABLE");
  }
  turn.sentences.sort((a, b) => a.index - b.index);
  return turn;
}

export interface TurnInput {
  conversationId: string;
  text: string;
  locale: string;
  voice?: string;
  /** What was said so far (at most 8 000 characters): Orazaka's voice turn keeps no history. */
  context?: string;
}

export interface OrazakaClient {
  /** The installation id the voice turns run under (the wellbeing pack, installed once with its consent). */
  installation(): Promise<string>;
  turn(input: TurnInput): Promise<Turn>;
}

const Installation = z.object({ id: z.string().optional(), installationId: z.string().optional(), studioKey: z.string().optional() });
// Any Studio of the pack installs the pack; the first one is the quietest. The voice turn runs under that installation.
const WELLBEING_STUDIO = "guided-journaling";

export function createOrazakaClient(options: { baseUrl: string; apiKey: string; consent: string; region: string; fetch?: Fetch; timeoutMs?: number }): OrazakaClient {
  const doFetch = options.fetch ?? fetch;
  const base = options.baseUrl.replace(/\/$/, "");
  let installationId: string | null = null;

  async function send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(`${base}${path}`, {
        ...init,
        headers: { authorization: `Bearer ${options.apiKey}`, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
        cache: "no-store",
      });
    } catch {
      throw new OrazakaError(503, "AI_UNAVAILABLE");
    }
  }
  const idOf = (v: unknown) => {
    const p = Installation.safeParse(v);
    return p.success ? (p.data.id ?? p.data.installationId ?? null) : null;
  };

  async function installation(): Promise<string> {
    if (installationId) return installationId;
    const mine = await send("/api/v1/studios/installations", { headers: { accept: "application/json" } });
    if (!mine.ok) throw refusalOf(mine.status);
    const list = (await mine.json().catch(() => [])) as unknown[];
    const found = Array.isArray(list) ? list.map((i) => ({ id: idOf(i), key: Installation.safeParse(i).data?.studioKey })).find((i) => i.key === WELLBEING_STUDIO && i.id) : undefined;
    if (found?.id) return (installationId = found.id);
    const made = await send(`/api/v1/studios/${WELLBEING_STUDIO}/installations?locale=en`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ config: {}, consentVersion: options.consent, ageAttested: true, region: options.region }),
    });
    if (!made.ok) throw refusalOf(made.status);
    const id = idOf(await made.json().catch(() => null));
    if (!id) throw new OrazakaError(502, "AI_SHAPE");
    return (installationId = id);
  }

  return {
    installation,
    async turn(input) {
      const form = new FormData();
      form.set("text", input.text);
      form.set("conversationId", input.conversationId);
      form.set("locale", input.locale);
      form.set("installationId", await installation());
      if (input.voice) form.set("voice", input.voice);
      if (input.context) form.set("context", input.context);
      const res = await send("/api/v1/voice/turns", { method: "POST", headers: { accept: "text/event-stream" }, body: form });
      if (!res.ok) throw refusalOf(res.status);
      return parseTurn(await res.text());
    },
  };
}

const holder = globalThis as unknown as { __yororisOrazaka?: OrazakaClient | null };

/** The configured edge, or null when none is configured (the moment then says it is not available right now). */
export function orazaka(): OrazakaClient | null {
  if (holder.__yororisOrazaka !== undefined) return holder.__yororisOrazaka;
  const env = readEnv();
  if (!env.AI_API_URL || !env.AI_API_KEY) return null;
  return (holder.__yororisOrazaka = createOrazakaClient({ baseUrl: env.AI_API_URL, apiKey: env.AI_API_KEY, consent: env.AI_WELLBEING_CONSENT, region: env.APP_REGION }));
}

/** Tests: answer with this client (undefined: back to the configured one). */
export function useOrazakaClient(client: OrazakaClient | null | undefined) {
  holder.__yororisOrazaka = client;
}
