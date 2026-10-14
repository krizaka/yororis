import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The version shown in the footer, read at build: `APP_VERSION` if set, else package.json + the short sha of the commit. */
export function version(): string {
  const v = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string }).version;
  let sha = process.env.APP_VERSION_SHA ?? "";
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
    } catch {
      /* no git on the builder */
    }
  }
  return process.env.APP_VERSION ?? (sha ? `${v}+${sha}` : v);
}
