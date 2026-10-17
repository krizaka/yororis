import { NextResponse } from "next/server";

import { appVersion } from "@/lib/version";

/** The health route of the dev checklist (`site.healthy`): public, no data, the version that runs. */
export async function GET() {
  return NextResponse.json({ status: "ok", version: appVersion() }, { headers: { "cache-control": "no-store" } });
}
