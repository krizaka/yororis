import { MomentView } from "@/components/console/MomentView";
import { pageMember } from "@/lib/auth";
import { readEnv } from "@/lib/env";
import { limits, stopsFor } from "@/lib/moment-api";
import { orazaka } from "@/lib/orazaka";

/** The Moment: a listening space with a face and a voice, answered by Orazaka's wellbeing pack — and nothing else answers. */
export default async function MomentPage() {
  const member = await pageMember();
  return <MomentView available={orazaka() !== null} minutes={limits().minutes} stops={member ? stopsFor(member.id) : null} calmMotion={member?.calmMotion ?? false} voice={readEnv().APP_VOICE_TURNS === "on"} />;
}
