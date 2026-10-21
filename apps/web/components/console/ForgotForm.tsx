"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { createKrizakaForm } from "@krizaka/ui/form";
import { useState } from "react";
import { z } from "zod";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

const forgot = createKrizakaForm({ schema: z.object({ email: z.string().trim().min(1).email() }), defaultValues: { email: "" } });

/** Asks for a link to choose a new password. The page says the same thing whatever the address. */
export function ForgotForm() {
  const { say, locale } = useSay();
  const [state, setState] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const request = useMutation({ mutationFn: (body: { email: string }) => krizakaFetch("/api/auth/forgot", { method: "POST", json: body }) });
  const form = forgot.useForm({
    i18n: { t: (key, vars) => say(key, vars as Record<string, string | number> | undefined), locale },
    onSubmit: async (values) => {
      setState(null);
      try {
        await request.mutateAsync(values);
        setState({ tone: "success", text: say("forgot.sent") });
      } catch (error) {
        setState({ tone: "danger", text: say(`errors.${errorKey(error)}`) });
      }
    },
  });
  return (
    <form.Form aria-label={say("forgot.title")} className="flex flex-col gap-4">
      <form.TextField name="email" label={say("forgot.email")} type="email" autoComplete="username" />
      {state ? <Alert tone={state.tone}>{state.text}</Alert> : null}
      <form.Submit size="lg" shimmer className="w-full">
        {say("forgot.submit")}
      </form.Submit>
    </form.Form>
  );
}
