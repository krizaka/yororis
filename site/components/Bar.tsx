"use client";

/* The bar of the Krizaka family (NAV-SYS), built on @krizaka/ui's NavBar, in three fixed zones.
   Left — who am I: the Yororis mark, and the family switcher (<Family/>, empty until NavBar.Family ships).
   Centre — this site: What it is · How we're building it · What it is not (never a link to another site).
   Right — tools: GitHub of this repository · theme · language · the one action, "Talk to us about Yororis". */

import { useCallback, useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@krizaka/icons";
import { YororisLogo } from "@krizaka/ui";
import { Button } from "@krizaka/ui/button";
import { NavBar } from "@krizaka/ui/nav-bar";
import { useTheme } from "@krizaka/ui/theme";
import type { Messages } from "@/lib/messages";
import { CONTACT, REPO, SECTIONS } from "@/lib/site";
import { Family } from "./Family";
import { GitHubMark } from "./GitHubMark";

const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribe(onChange: () => void) {
  const q = window.matchMedia(DARK_QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

/** The theme actually shown, and a dark ⇄ light toggle (the mode itself may be "system"). */
function useShownTheme() {
  const { mode, setMode } = useTheme();
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia(DARK_QUERY).matches, () => true);
  const theme: "dark" | "light" = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  const toggle = useCallback(() => setMode(theme === "dark" ? "light" : "dark"), [theme, setMode]);
  return { theme, toggle };
}

export function Bar({ m, home, otherHref, otherLabel, other }: { m: Messages["bar"]; home: string; otherHref: string; otherLabel: string; other: string }) {
  const { theme, toggle } = useShownTheme();
  const themeLabel = theme === "dark" ? m.toLight : m.toDark;
  const themeIcon = theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />;
  return (
    <div className="kz-site-bar-wrap pointer-events-none fixed inset-x-0 top-3 z-50">
      <NavBar.Root label={m.label} className="kz-site-bar pointer-events-auto">
        <NavBar.Brand asChild>
          <a href={home} aria-label={m.home}>
            <YororisLogo size={26} />
            Yororis
          </a>
        </NavBar.Brand>
        <Family />

        <NavBar.Items>
          {SECTIONS.map((s) => (
            <NavBar.Link key={s.id} asChild>
              <a href={`#${s.id}`}>{m[s.key]}</a>
            </NavBar.Link>
          ))}
        </NavBar.Items>

        <NavBar.Actions className="gap-1">
          <Button asChild variant="ghost" size="icon" shape="pill" className="hidden h-9 w-9 lg:inline-flex">
            <a href={REPO} target="_blank" rel="noopener noreferrer" aria-label={m.github}>
              <GitHubMark size={15} />
            </a>
          </Button>
          <Button type="button" variant="ghost" size="icon" shape="pill" onClick={toggle} aria-label={themeLabel} className="hidden h-9 w-9 md:inline-flex">
            {themeIcon}
          </Button>
          <Button asChild variant="outline" size="sm" className="hidden h-7 w-9 px-0 font-mono text-[11px] font-semibold tracking-wide md:inline-flex">
            <a href={otherHref} hrefLang={other.toLowerCase()} lang={other.toLowerCase()} aria-label={otherLabel}>
              {other}
            </a>
          </Button>
          <Button asChild variant="primary" size="sm" shape="cut" className="ml-1 hidden font-bold md:inline-flex">
            <a href={CONTACT}>{m.talk}</a>
          </Button>

          <NavBar.Mobile openLabel={m.menu} closeLabel={m.close} className="gap-1 p-3">
            {SECTIONS.map((s) => (
              <NavBar.MobileLink key={s.id} asChild>
                <a href={`#${s.id}`}>{m[s.key]}</a>
              </NavBar.MobileLink>
            ))}
            <NavBar.MobileLink asChild>
              <a href={REPO} target="_blank" rel="noopener noreferrer">
                {m.github}
              </a>
            </NavBar.MobileLink>
            <NavBar.MobileLink asChild>
              <button type="button" onClick={toggle} className="w-full text-left">
                {themeLabel}
              </button>
            </NavBar.MobileLink>
            <NavBar.MobileLink asChild>
              <a href={otherHref} hrefLang={other.toLowerCase()} lang={other.toLowerCase()}>
                {otherLabel}
              </a>
            </NavBar.MobileLink>
            <Button asChild variant="primary" size="md" shape="cut" className="mt-2 font-bold">
              <a href={CONTACT}>{m.talk}</a>
            </Button>
          </NavBar.Mobile>
        </NavBar.Actions>
      </NavBar.Root>
    </div>
  );
}
