/** Server start-up: a production start is refused without a written release decision (FRAMEWORK §5). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertStartable } = await import("./lib/env");
  try {
    assertStartable();
  } catch (error) {
    console.error(`[web] refusing to start: ${(error as Error).message}`);
    process.exit(1);
  }
}
