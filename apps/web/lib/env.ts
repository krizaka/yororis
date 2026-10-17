import { z } from "zod";

/**
 * The environment of the member space, one typed module (variables named by context). Fail-closed:
 * - `NODE_ENV=production` refuses to start without `APP_RELEASE_APPROVAL`, the reference of a written and signed decision
 *   (docs/FRAMEWORK.md §5 — construction mode); the reference is logged;
 * - the secrets are required, never defaulted: a local run copies `.env.example`.
 */
type Env = Record<string, string | undefined>;

const Schema = z.object({
  AUTH_SESSION_SECRET: z.string().min(32, "must be at least 32 characters"),
  AUTH_DEMO_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  APP_RELEASE_APPROVAL: z.string().min(1).optional(),
  // The moment's AI is Orazaka's wellbeing pack, through its edge and a service key (a DO SECRET). Both absent: the moment is
  // "not available right now", never a canned answer (fail closed).
  AI_API_URL: z.string().url().optional(),
  AI_API_KEY: z.string().min(8).optional(),
  // The version of the pack's consent statement the QA cast agrees to (pack.yaml `consent.version`), and the region whose crisis line answers.
  AI_WELLBEING_CONSENT: z.string().min(1).default("1.0"),
  APP_REGION: z.string().regex(/^[A-Z]{2}(-[A-Z]{2})?$/).default("CA-QC"),
  // The presence that stops (docs/FRAMEWORK.md): the longest moment and how many a day and a week. QA may widen them on dev.
  APP_MOMENT_MINUTES: z.coerce.number().int().min(1).max(25).default(25),
  APP_MOMENTS_PER_DAY: z.coerce.number().int().min(1).max(50).default(1),
  APP_MOMENTS_PER_WEEK: z.coerce.number().int().min(1).max(350).default(3),
});

export class ConfigurationError extends Error {}

export function readEnv(env: Env = process.env) {
  const blank = (v: string | undefined) => v?.trim() || undefined;
  const parsed = Schema.safeParse({
    AUTH_SESSION_SECRET: env.AUTH_SESSION_SECRET,
    AUTH_DEMO_PASSWORD: env.AUTH_DEMO_PASSWORD,
    APP_RELEASE_APPROVAL: blank(env.APP_RELEASE_APPROVAL),
    AI_API_URL: blank(env.AI_API_URL),
    AI_API_KEY: blank(env.AI_API_KEY),
    AI_WELLBEING_CONSENT: blank(env.AI_WELLBEING_CONSENT),
    APP_REGION: blank(env.APP_REGION),
    APP_MOMENT_MINUTES: blank(env.APP_MOMENT_MINUTES),
    APP_MOMENTS_PER_DAY: blank(env.APP_MOMENTS_PER_DAY),
    APP_MOMENTS_PER_WEEK: blank(env.APP_MOMENTS_PER_WEEK),
  });
  if (!parsed.success) throw new ConfigurationError(parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  return parsed.data;
}

export function assertStartable(env: Env = process.env): void {
  if (env.NODE_ENV === "production" && !env.APP_RELEASE_APPROVAL?.trim()) throw new ConfigurationError("APP_RELEASE_APPROVAL is required in production (construction mode: a written, signed decision)");
  readEnv(env);
  if (env.NODE_ENV === "production") console.info(`[web] release approval: ${env.APP_RELEASE_APPROVAL}`);
}
