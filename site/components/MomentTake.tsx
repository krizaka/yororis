"use client";

import { Mascot } from "@krizaka/ui/mascots";
import { DeviceFrame } from "@krizaka/ui/step-showcase";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Messages } from "@/lib/messages";
import { TAKE } from "@/lib/site";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const q = window.matchMedia(REDUCED);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

/**
 * « Un visage et une voix », for real: the Moment take in a phone frame — the presence introduces itself, the voice is on, the
 * time left and the crisis lines stay on screen. Muted, looping, the poster first; it plays only while it is on screen and never
 * under `prefers-reduced-motion` (the poster stays, the button plays it on purpose). The crane perches on the frame in a halo.
 * Nothing is offered: the line under it says it is recorded locally, with a fictional cast, under construction.
 */
export function MomentTake({ m }: { m: Messages["hero"]["take"] }) {
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const still = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);

  useEffect(() => {
    const el = video.current;
    if (!el || still) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting) void el.play().catch(() => undefined);
      else el.pause();
    }, { threshold: 0.35 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [still]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  return (
    <figure ref={root} className="yo-take" role="group" aria-label={m.aria}>
      <div className="yo-take-stage">
        <DeviceFrame kind="phone" className="yo-take-phone">
          <video
            ref={video}
            className="yo-take-video"
            src={TAKE.mp4}
            poster={TAKE.poster}
            width={TAKE.width}
            height={TAKE.height}
            muted
            loop
            playsInline
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            aria-hidden
          />
        </DeviceFrame>
        <div className="yo-hero-crane yo-take-crane" aria-hidden>
          <Mascot bird="crane" mood="welcome" size={84} className="yo-hero-mark" />
        </div>
      </div>
      <button type="button" className="yo-take-toggle" onClick={toggle} aria-pressed={playing}>
        {playing ? m.pause : m.play}
      </button>
      <figcaption className="yo-take-note">{m.note.replace("{seconds}", String(TAKE.seconds))}</figcaption>
    </figure>
  );
}
