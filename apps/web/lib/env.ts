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
  // The fictional cast's shared password: only without a database (local run, CI). With one, the invited testers have their own.
  AUTH_DEMO_PASSWORD: z.string().min(12, "must be at least 12 characters").optional(),
  // The invited testers' accounts (docs/FRAMEWORK.md §5): a Postgres on the shared cluster, TLS verified against its CA.
  DATABASE_URL: z.string().url().optional(),
  DATABASE_CA_CERT: z.string().optional(),
  // The public address of the app: the links of the e-mails (password reset) are built on it, never on a request header.
  APP_URL: z.string().url().optional(),
  // Outgoing e-mail (the reset link): Mailgun, as the other products; without it the reset answers the same and sends nothing.
  MAIL_PROVIDER: z.enum(["mailgun", "none"]).default("none"),
  MAIL_API_KEY: z.string().optional(),
  MAIL_DOMAIN: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_API_URL: z.string().url().default("https://api.mailgun.net"),
  APP_RELEASE_APPROVAL: z.string().min(1).optional(),
  // Sign-up is closed, for good: there is no sign-up in this app (the cast is fixed and invited by construction), and the one door
  // that exists (`/api/auth/sign-up`) answers 403. The flag exists so that no deployment can claim otherwise: only `false` starts.
  AUTH_SIGNUP_ENABLED: z.string().default("false").refine((v) => v === "false", "sign-up is closed: AUTH_SIGNUP_ENABLED can only be false"),
  // What runs, shown on the screen and answered by /api/healthz: `X.Y.Z+sha`, set by the image build.
  APP_VERSION: z.string().min(1).optional(),
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
    AUTH_DEMO_PASSWORD: blank(env.AUTH_DEMO_PASSWORD),
    DATABASE_URL: blank(env.DATABASE_URL),
    DATABASE_CA_CERT: blank(env.DATABASE_CA_CERT),
    APP_URL: blank(env.APP_URL),
    MAIL_PROVIDER: blank(env.MAIL_PROVIDER),
    MAIL_API_KEY: blank(env.MAIL_API_KEY),
    MAIL_DOMAIN: blank(env.MAIL_DOMAIN),
    MAIL_FROM: blank(env.MAIL_FROM),
    MAIL_API_URL: blank(env.MAIL_API_URL),
    APP_RELEASE_APPROVAL: blank(env.APP_RELEASE_APPROVAL),
    AUTH_SIGNUP_ENABLED: blank(env.AUTH_SIGNUP_ENABLED),
    APP_VERSION: blank(env.APP_VERSION),
    AI_API_URL: blank(env.AI_API_URL),
    AI_API_KEY: blank(env.AI_API_KEY),
    AI_WELLBEING_CONSENT: blank(env.AI_WELLBEING_CONSENT),
    APP_REGION: blank(env.APP_REGION),
    APP_MOMENT_MINUTES: blank(env.APP_MOMENT_MINUTES),
    APP_MOMENTS_PER_DAY: blank(env.APP_MOMENTS_PER_DAY),
    APP_MOMENTS_PER_WEEK: blank(env.APP_MOMENTS_PER_WEEK),
  });
  if (!parsed.success) throw new ConfigurationError(parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  const d = parsed.data;
  if (!d.DATABASE_URL && !d.AUTH_DEMO_PASSWORD) throw new ConfigurationError("AUTH_DEMO_PASSWORD is required without DATABASE_URL");
  if (d.MAIL_PROVIDER === "mailgun" && !(d.MAIL_API_KEY && d.MAIL_DOMAIN)) throw new ConfigurationError("MAIL_PROVIDER=mailgun needs MAIL_API_KEY and MAIL_DOMAIN");
  return d;
}

export function assertStartable(env: Env = process.env): void {
  if (env.NODE_ENV === "production" && !env.APP_RELEASE_APPROVAL?.trim()) throw new ConfigurationError("APP_RELEASE_APPROVAL is required in production (construction mode: a written, signed decision)");
  readEnv(env);
  if (env.NODE_ENV === "production") console.info(`[web] release approval: ${env.APP_RELEASE_APPROVAL}`);
}
