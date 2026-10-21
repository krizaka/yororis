"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { createKrizakaForm } from "@krizaka/ui/form";
import { SettingsSection } from "@krizaka/ui/settings-layout";
import { useState } from "react";
import { z } from "zod";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

const change = createKrizakaForm({
  schema: z.object({ current: z.string().min(1), password: z.string().min(1) }),
  defaultValues: { current: "", password: "" },
});

/** The account's password: the current one is asked again; the other sign-ins end. */
export function PasswordSection() {
  const { say, locale } = useSay();
  const [state, setState] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const request = useMutation({ mutationFn: (body: { current: string; password: string }) => krizakaFetch("/api/auth/change", { method: "POST", json: body }) });
  const form = change.useForm({
    i18n: { t: (key, vars) => say(key, vars as Record<string, string | number> | undefined), locale },
    onSubmit: async (values) => {
      setState(null);
      try {
        await request.mutateAsync(values);
        setState({ tone: "success", text: say("account.password.saved") });
      } catch (error) {
        setState({ tone: "danger", text: say(`errors.${errorKey(error)}`) });
      }
    },
  });
  return (
    <SettingsSection id="password" title={say("account.password.title")} description={say("account.password.description")}>
      {state?.tone === "success" ? (
        <Alert tone="success">{state.text}</Alert>
      ) : (
      <form.Form aria-label={say("account.password.title")} className="flex flex-col gap-4">
        <form.TextField name="current" label={say("account.password.current")} type="password" autoComplete="current-password" />
        <form.TextField name="password" label={say("account.password.next")} type="password" autoComplete="new-password" />
        {state ? <Alert tone={state.tone}>{state.text}</Alert> : null}
        <div>
          <form.Submit size="sm">{say("account.password.submit")}</form.Submit>
        </div>
      </form.Form>
      )}
    </SettingsSection>
  );
}
