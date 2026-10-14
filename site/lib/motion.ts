import type { CSSProperties } from "react";

/* The `[data-reveal]` signature of @krizaka/ui (motion.css), revealed by its MotionObserver (mounted once in the layout).
   Never on the first screen (hero, crisis line): what the visitor sees on arrival is painted at once (LCP, CLS). */
export function reveal(i = 0): { "data-reveal": string; style?: CSSProperties } {
  const delay = Math.min(i, 5) * 70;
  return { "data-reveal": "", ...(delay ? { style: { "--kz-delay": `${delay}ms` } as CSSProperties } : {}) };
}
