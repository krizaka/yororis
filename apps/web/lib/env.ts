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
});

export class ConfigurationError extends Error {}

export function readEnv(env: Env = process.env) {
  const parsed = Schema.safeParse({ AUTH_SESSION_SECRET: env.AUTH_SESSION_SECRET, AUTH_DEMO_PASSWORD: env.AUTH_DEMO_PASSWORD, APP_RELEASE_APPROVAL: env.APP_RELEASE_APPROVAL?.trim() || undefined });
  if (!parsed.success) throw new ConfigurationError(parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  return parsed.data;
}

export function assertStartable(env: Env = process.env): void {
  if (env.NODE_ENV === "production" && !env.APP_RELEASE_APPROVAL?.trim()) throw new ConfigurationError("APP_RELEASE_APPROVAL is required in production (construction mode: a written, signed decision)");
  readEnv(env);
  if (env.NODE_ENV === "production") console.info(`[web] release approval: ${env.APP_RELEASE_APPROVAL}`);
}
