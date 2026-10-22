import { MomentView } from "@/components/console/MomentView";
import { pageMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { readEnv } from "@/lib/env";
import { limits, stopsFor } from "@/lib/moment-api";
import { current } from "@/lib/neighbours";
import { orazaka } from "@/lib/orazaka";

/** The Moment: a listening space with a face and a voice, answered by Orazaka's wellbeing pack — and nothing else answers. */
export default async function MomentPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "fr" ? "fr" : "en";
  const member = await pageMember();
  const c = member && dbConfigured() ? await current(member.id, Date.now(), Math.random) : null;
  return <MomentView available={orazaka() !== null} minutes={limits().minutes} stops={member ? stopsFor(member.id) : null} calmMotion={member?.calmMotion ?? false} voice={readEnv().APP_VOICE_TURNS === "on"} neighbour={c ? { name: c.neighbour.name, presence: c.neighbour.presence, line: c.neighbour.line[locale] } : null} />;
}
