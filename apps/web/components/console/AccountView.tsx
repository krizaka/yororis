"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { Button } from "@krizaka/ui/button";
import { ConfirmButton } from "@krizaka/ui/confirm-button";
import { DescriptionList } from "@krizaka/ui/description-list";
import { createKrizakaForm } from "@krizaka/ui/form";
import { SettingsLayout, SettingsSection } from "@krizaka/ui/settings-layout";
import { Switch } from "@krizaka/ui/switch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

import { PasswordSection } from "./PasswordSection";

export interface AccountDto {
  email: string;
  organisation: string;
  locale: "en" | "fr";
  name: string;
  subtitles: boolean;
  calmMotion: boolean;
}

const profileForm = createKrizakaForm({
  schema: z.object({ name: z.string().trim().min(1).max(40), locale: z.enum(["en", "fr"]) }),
  defaultValues: { name: "", locale: "en" as "en" | "fr" },
});

/** Account on @krizaka/ui's SettingsLayout: each section a titled card with its own save. The parts that wait for the product (consent, export) say so. */
export function AccountView({ account, passwordEnabled = false }: { account: AccountDto; passwordEnabled?: boolean }) {
  const { say, locale } = useSay();
  const router = useRouter();
  const i18n = { t: (key: string, vars?: unknown) => say(key, vars as Record<string, string | number> | undefined), locale };
  const [notice, setNotice] = useState<{ section: string; tone: "success" | "danger"; text: string } | null>(null);
  const tell = (section: string, tone: "success" | "danger", text: string) => setNotice({ section, tone, text });
  const fail = (section: string, error: unknown) => tell(section, "danger", say(`errors.${errorKey(error)}`));
  const patch = useMutation({ mutationFn: (body: object) => krizakaFetch("/api/me", { method: "PATCH", json: body }) });
  const remove = useMutation({
    mutationFn: () => krizakaFetch("/api/me", { method: "DELETE" }),
    onSuccess: () => {
      router.replace(`/${locale}/sign-in`);
      router.refresh();
    },
    onError: (e) => fail("delete", e),
  });
  const profile = profileForm.useForm({
    i18n,
    defaultValues: { name: account.name, locale: account.locale },
    onSubmit: async (values) => {
      try {
        await patch.mutateAsync(values);
        if (values.locale !== locale) router.replace(`/${values.locale}/account`);
        else {
          tell("profile", "success", say("account.profile.saved"));
          router.refresh();
        }
      } catch (e) {
        fail("profile", e);
      }
    },
  });
  const choose = (key: "subtitles" | "calmMotion", on: boolean) =>
    patch.mutate({ [key]: on }, { onSuccess: () => tell("display", "success", say("account.display.saved")), onError: (e) => fail("display", e) });
  const note = (section: string) => (notice?.section === section ? <Alert tone={notice.tone}>{notice.text}</Alert> : null);
  const nav = (passwordEnabled ? (["profile", "password", "display", "consent", "notebook", "delete"] as const) : (["profile", "display", "consent", "notebook", "delete"] as const)).map((id) => ({ id, label: say(`account.nav.${id}`), href: `#${id}` }));

  return (
    <SettingsLayout className="w-full" title={say("account.title")} description={say("account.description")} nav={nav} navLabel={say("account.navLabel")} linkAs={Link}>
      <SettingsSection id="profile" title={say("account.profile.title")} description={say("account.profile.description")}>
        <profile.Form aria-label={say("account.profile.title")} className="flex flex-col gap-4">
          <DescriptionList
            layout="inline"
            items={[
              { term: say("account.profile.email"), details: account.email, hint: say("account.profile.emailHint") },
              { term: say("account.profile.organisation"), details: account.organisation },
            ]}
          />
          <profile.TextField name="name" label={say("account.profile.name")} maxLength={40} autoComplete="given-name" />
          <profile.Select
            name="locale"
            label={say("account.profile.language")}
            options={[
              { value: "en", label: say("account.profile.languageEn") },
              { value: "fr", label: say("account.profile.languageFr") },
            ]}
          />
          {note("profile")}
          <div>
            <profile.Submit size="sm">
              {say("account.profile.save")}
            </profile.Submit>
          </div>
        </profile.Form>
      </SettingsSection>

      {passwordEnabled ? <PasswordSection /> : null}

      <SettingsSection id="display" title={say("account.display.title")} description={say("account.display.description")}>
        {(
          [
            ["subtitles", account.subtitles, "subtitles", "subtitlesHint"],
            ["calmMotion", account.calmMotion, "calm", "calmHint"],
          ] as const
        ).map(([key, on, label, hint]) => (
          <div key={key} className="flex items-center justify-between gap-4 text-sm text-fg">
            <span id={`choice-${key}`} className="flex flex-col">
              <span className="font-medium">{say(`account.display.${label}`)}</span>
              <span className="text-fg-secondary">{say(`account.display.${hint}`)}</span>
            </span>
            <Switch aria-labelledby={`choice-${key}`} defaultChecked={on} disabled={patch.isPending} onCheckedChange={(v) => choose(key, v)} />
          </div>
        ))}
        {note("display")}
      </SettingsSection>

      <SettingsSection id="consent" title={say("account.consent.title")} description={say("account.consent.description")}>
        <DescriptionList
          layout="inline"
          items={[
            { term: say("account.consent.version"), details: say("account.consent.versionNone"), hint: say("account.consent.statusHint") },
            { term: say("account.consent.status"), details: "—" },
            { term: say("account.consent.age"), details: "—", hint: say("account.consent.ageHint") },
          ]}
        />
      </SettingsSection>

      <SettingsSection id="notebook" title={say("account.notebook.title")} description={say("account.notebook.description")}>
        <p className="text-sm text-fg-secondary">{say("account.notebook.hint")}</p>
        <div>
          <Button size="sm" variant="secondary" disabled>
            {say("account.notebook.action")}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection id="delete" title={say("account.delete.title")} description={say("account.delete.description")}>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg-secondary marker:text-fg-accent">
          <li>{say("account.delete.now")}</li>
          <li>{say("account.delete.remains")}</li>
        </ul>
        {note("delete")}
        <div>
          <ConfirmButton size="sm" variant="danger" confirmLabel={say("account.delete.confirm")} loading={remove.isPending} onConfirm={() => remove.mutate()}>
            {say("account.delete.action")}
          </ConfirmButton>
        </div>
      </SettingsSection>
    </SettingsLayout>
  );
}
