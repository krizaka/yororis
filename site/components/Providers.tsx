"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@krizaka/ui/theme";
import { MotionObserver } from "@krizaka/ui/motion";

/* Theme: system by default, a toggle in the bar, persisted as `kz-theme` (ThemeScript in <head> applies it before the
   first paint). Motion: @krizaka/ui's one conductor, mounted once — reveals once, pauses off screen, and under
   prefers-reduced-motion shows everything at once and follows nothing. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultMode="system">
      {children}
      <MotionObserver />
    </ThemeProvider>
  );
}
