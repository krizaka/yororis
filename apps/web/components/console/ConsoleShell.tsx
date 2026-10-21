"use client";

import { ClockIcon, HomeIcon, LogoutIcon, MomentIcon, SettingsIcon, UsersIcon } from "@krizaka/icons";
import { krizakaFetch, useMutation } from "@krizaka/query";
import { YororisLogo } from "@krizaka/ui";
import { AppShell } from "@krizaka/ui/app-shell";
import { Button } from "@krizaka/ui/button";
import { SiteFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { ThemeToggle } from "@krizaka/ui/theme";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useSay } from "@/lib/i18n-client";

/**
 * The frame of the signed-in space: AppShell (sidebar that folds, drawer on a phone), the member's destinations and, for an
 * organiser, the organisation's. A permanent strip says what this is: in development, not available.
 */
export function ConsoleShell({ locale, email, organiser, version, children }: { locale: "en" | "fr"; email: string; organiser: boolean; version: string; children: React.ReactNode }) {
  const { say } = useSay();
  const router = useRouter();
  const path = usePathname() ?? "";
  const home = `/${locale}`;
  const other = locale === "en" ? "fr" : "en";
  const rest = path.slice(home.length);
  const signOut = useMutation({
    mutationFn: () => krizakaFetch("/api/auth/sign-out", { method: "POST" }),
    onSettled: () => {
      router.replace(`/${locale}/sign-in`);
      router.refresh();
    },
  });
  const current = (to: string, exact = false) => (exact ? path === to : path === to || path.startsWith(`${to}/`));
  const titleKey = path.startsWith(`${home}/admin/moments`) ? "shell.adminMoments" : path.startsWith(`${home}/admin/members`) ? "shell.members" : path.startsWith(`${home}/account`) ? "shell.account" : path.startsWith(`${home}/moment`) ? "shell.moment" : "shell.dashboard";
  const item = (to: string, label: string, icon: React.ReactNode, exact = false) => (
    <AppShell.Item asChild label={label} icon={icon} current={current(to, exact)}>
      <Link href={to}>{label}</Link>
    </AppShell.Item>
  );
  return (
    <AppShell.Root skipLabel={say("shell.skip")}>
      <AppShell.Sidebar
        label={say("shell.sidebarLabel")}
        brand={
          <Link href={home} className="inline-flex items-center gap-2">
            <YororisLogo size={24} animated={false} /> Yororis
          </Link>
        }
        closeLabel={say("shell.closeMenu")}
        collapseLabels={[say("shell.collapse"), say("shell.expand")]}
        footer={
          <div className="flex flex-col gap-1 px-3 pb-2 text-xs text-fg-muted">
            <span className="truncate" title={email}>
              {say("shell.signedInAs", { email })}
            </span>
            <span data-testid="app-version">{say("shell.version", { version })}</span>
          </div>
        }
      >
        <AppShell.Group>{say("shell.groupYou")}</AppShell.Group>
        {item(home, say("shell.dashboard"), <HomeIcon />, true)}
        {item(`${home}/moment`, say("shell.moment"), <MomentIcon />)}
        {item(`${home}/account`, say("shell.account"), <SettingsIcon />)}
        {organiser ? (
          <>
            <AppShell.Group>{say("shell.groupOrg")}</AppShell.Group>
            {item(`${home}/admin/members`, say("shell.members"), <UsersIcon />)}
            {item(`${home}/admin/moments`, say("shell.adminMoments"), <ClockIcon />)}
          </>
        ) : null}
      </AppShell.Sidebar>
      <AppShell.Body>
        <AppShell.Header
          title={say(titleKey)}
          menuLabel={say("shell.openMenu")}
          actions={
            <>
              <Link href={`/${other}${rest}`} hrefLang={other} lang={other} className="rounded-md px-2 py-1 text-sm text-fg-secondary hover:text-fg">
                <span className="sr-only">{say("shell.language")} · </span>
                {say("shell.otherLanguage")}
              </Link>
              <ThemeToggle label={say("shell.theme")} variant="ghost" />
              <Button size="sm" variant="secondary" loading={signOut.isPending} onClick={() => signOut.mutate()}>
                <LogoutIcon size={16} /> {say("shell.signOut")}
              </Button>
            </>
          }
        />
        <p role="note" className="border-b border-border-default bg-surface-1 px-4 py-2 text-center text-xs font-medium text-fg-secondary">
          {say("shell.banner")}
        </p>
        <AppShell.Main>{children}</AppShell.Main>
        <SiteFooter current="yororis" family={false} variant="app" env="dev" version={version} labels={familyLabels[locale]} />
      </AppShell.Body>
    </AppShell.Root>
  );
}
