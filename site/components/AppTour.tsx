"use client";

import { StepShowcase } from "@krizaka/ui/step-showcase";

type Step = { id: string; title: string; description: string; poster: string; alt: string };
type Player = { label: string; title: string; play: string; pause: string; step: string };

/** The real screens of the local member space in one phone frame. A client wrapper: the step label is a function of @krizaka/ui. */
export function AppTour({ player, steps }: { player: Player; steps: Step[] }) {
  return (
    <StepShowcase
      label={player.label}
      device="phone"
      deviceTitle={player.title}
      autoplay={false}
      labels={{ play: player.play, pause: player.pause, step: (n, total) => player.step.replace("{n}", String(n)).replace("{total}", String(total)) }}
      steps={steps}
    />
  );
}
