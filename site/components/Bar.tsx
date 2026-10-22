"use client";

/* The bar, built on @krizaka/ui's NavBar, in three fixed zones. Yororis is independent: no family switcher.
   Left — who am I: the Yororis mark (no version chip: the version is in the footer).
   Centre — this site: What it is · How we're building it · What it is not (never a link to another site).
   Right — tools: the repository (NavBar.Repo) · theme · language · the one action, "Talk to us about Yororis". */

import { useCallback, useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@krizaka/icons";
import { YororisLogo } from "@krizaka/ui";
import { Button } from "@krizaka/ui/button";
import { languageNames } from "@krizaka/ui/language-switch";
import { NavBar } from "@krizaka/ui/nav-bar";
import { useTheme } from "@krizaka/ui/theme";
import type { Locale, Messages } from "@/lib/messages";
import { contactFor, REPO, SECTIONS } from "@/lib/site";

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

export function Bar({ m, locale, home, otherHref, otherName }: { m: Messages["bar"]; locale: Locale; home: string; otherHref: string; otherName: string }) {
  const otherCode = locale === "en" ? "fr" : "en";
  const languages = [
    { code: locale, name: languageNames[locale] ?? locale, href: home },
    { code: otherCode, name: otherName, href: otherHref },
  ].sort((a, b) => a.code.localeCompare(b.code));
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
        <NavBar.Items>
          {SECTIONS.map((s) => (
            <NavBar.Link key={s.id} asChild>
              <a href={`#${s.id}`}>{m[s.key]}</a>
            </NavBar.Link>
          ))}
        </NavBar.Items>

        <NavBar.Actions className="gap-1">
          <NavBar.Repo href={REPO} label={m.github} className="hidden lg:inline-flex" />
          <Button type="button" variant="ghost" size="icon" shape="pill" onClick={toggle} aria-label={themeLabel} className="hidden h-9 w-9 md:inline-flex">
            {themeIcon}
          </Button>
          <span className="hidden md:inline-flex">
            <NavBar.Language label={m.language} current={locale} languages={languages} />
          </span>
          <Button asChild variant="primary" size="sm" className="ml-1 hidden font-bold md:inline-flex">
            <a href={contactFor(locale)}>{m.talk}</a>
          </Button>

          <NavBar.Mobile openLabel={m.menu} closeLabel={m.close} className="gap-1 p-3">
            {SECTIONS.map((s) => (
              <NavBar.MobileLink key={s.id} asChild>
                <a href={`#${s.id}`}>{m[s.key]}</a>
              </NavBar.MobileLink>
            ))}
            <NavBar.MobilePreferences label={m.preferences}>
              <Button type="button" variant="ghost" size="icon" shape="pill" onClick={toggle} aria-label={themeLabel} className="h-9 w-9">
                {themeIcon}
              </Button>
              <NavBar.Language label={m.language} current={locale} languages={languages} />
            </NavBar.MobilePreferences>
            <Button asChild variant="primary" size="md" className="mt-2 font-bold">
              <a href={contactFor(locale)}>{m.talk}</a>
            </Button>
              </NavBar.Mobile>
        </NavBar.Actions>
      </NavBar.Root>
    </div>
  );
}
