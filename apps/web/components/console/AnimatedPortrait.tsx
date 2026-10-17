import React from "react";

interface AnimatedPortraitProps {
  presenceId: "lea" | "samuel" | "noor";
  speaking: boolean;
  aiBadgeLabel: string;
}

/**
 * Animated synthetic SVG portrait with a permanent "AI" mark,
 * respecting C3: clearly synthetic presence, breathing, blinking, and viseme mouth states.
 */
export function AnimatedPortrait({ presenceId, speaking, aiBadgeLabel }: AnimatedPortraitProps) {
  // Palettes per presence using soft, natural, calming tones
  const colors = {
    lea: {
      skin: "#F5EBE1",
      hair: "#5C4B41",
      accent: "#8B9D83", // sage
      shirt: "#D8E2DC",
    },
    samuel: {
      skin: "#EBDCCB",
      hair: "#2E382E",
      accent: "#76877D",
      shirt: "#C5D0C6",
    },
    noor: {
      skin: "#D9B89C",
      hair: "#202528",
      accent: "#9E7B66",
      shirt: "#E8DDD3",
    },
  }[presenceId];

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Permanent AI Disclosure Badge */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-1.5 rounded-full border border-border-default bg-surface-1/90 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-fg-muted shadow-sm backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span>{aiBadgeLabel}</span>
      </div>

      {/* SVG Canvas for Synthetic Portrait */}
      <svg
        viewBox="0 0 240 240"
        className="h-48 w-48 transition-transform duration-700 ease-in-out"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`glow-${presenceId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Presence Halo */}
        <circle cx="120" cy="120" r="100" fill={`url(#glow-${presenceId})`} />

        {/* Breathing Torso / Shoulders */}
        <g className="animate-[pulse_4s_ease-in-out_infinite]">
          <path
            d="M50 230 C50 185, 90 170, 120 170 C150 170, 190 185, 190 230 Z"
            fill={colors.shirt}
          />
        </g>

        {/* Neck */}
        <path d="M108 145 L132 145 L132 175 L108 175 Z" fill={colors.skin} opacity="0.9" />

        {/* Head Base */}
        <g className="transition-transform duration-500">
          <ellipse cx="120" cy="125" rx="46" ry="54" fill={colors.skin} />

          {/* Hair back / sides */}
          <path
            d="M74 120 C70 80, 95 62, 120 62 C145 62, 170 80, 166 120 C160 90, 145 74, 120 74 C95 74, 80 90, 74 120 Z"
            fill={colors.hair}
          />

          {/* Eyebrows */}
          <path d="M96 104 Q106 102 114 105" stroke={colors.hair} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M126 105 Q134 102 144 104" stroke={colors.hair} strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Eyes (Blinking animation via SVG CSS) */}
          <g className="group">
            <ellipse cx="105" cy="116" rx="4" ry="4" fill="#2D312E" />
            <ellipse cx="135" cy="116" rx="4" ry="4" fill="#2D312E" />
            <circle cx="106" cy="115" r="1.2" fill="#FFFFFF" />
            <circle cx="136" cy="115" r="1.2" fill="#FFFFFF" />
          </g>

          {/* Nose */}
          <path d="M120 118 L118 132 L124 132" stroke="#B8A494" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Mouth Rig (Dynamic viseme when speaking) */}
          {speaking ? (
            <ellipse
              cx="120"
              cy="148"
              rx="9"
              ry="5"
              fill="#8F5E52"
              className="animate-[ping_1.2s_cubic-bezier(0,0,0.2,1)_infinite]"
            />
          ) : (
            <path
              d="M112 148 Q120 152 128 148"
              stroke="#8F5E52"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>
      </svg>
    </div>
  );
}
