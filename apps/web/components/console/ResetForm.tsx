"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { createKrizakaForm } from "@krizaka/ui/form";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

const reset = createKrizakaForm({
  schema: z.object({ password: z.string().min(1), confirm: z.string().min(1) }),
  defaultValues: { password: "", confirm: "" },
});

/** Chooses a new password from the e-mailed link; the link is used up on success. */
export function ResetForm({ token }: { token: string }) {
  const { say, locale } = useSay();
  const [state, setState] = useState<{ tone: "success" | "danger"; text: string; again?: boolean } | null>(null);
  const request = useMutation({ mutationFn: (body: { token: string; password: string }) => krizakaFetch("/api/auth/reset", { method: "POST", json: body }) });
  const form = reset.useForm({
    i18n: { t: (key, vars) => say(key, vars as Record<string, string | number> | undefined), locale },
    onSubmit: async (values) => {
      setState(null);
      if (values.password !== values.confirm) return setState({ tone: "danger", text: say("reset.mismatch") });
      try {
        await request.mutateAsync({ token, password: values.password });
        setState({ tone: "success", text: say("reset.done") });
      } catch (error) {
        const key = errorKey(error);
        setState({ tone: "danger", text: key === "INVALID_TOKEN" ? say("reset.invalid") : say(`errors.${key}`), again: key === "INVALID_TOKEN" });
      }
    },
  });
  if (state?.tone === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{state.text}</Alert>
        <Link className="font-semibold text-fg-accent" href={`/${locale}/sign-in`}>
          {say("reset.toSignIn")}
        </Link>
      </div>
    );
  }
  return (
    <form.Form aria-label={say("reset.title")} className="flex flex-col gap-4">
      <form.TextField name="password" label={say("reset.password")} type="password" autoComplete="new-password" />
      <form.TextField name="confirm" label={say("reset.confirm")} type="password" autoComplete="new-password" />
      {state ? <Alert tone={state.tone}>{state.text}</Alert> : null}
      {state?.again ? (
        <Link className="font-semibold text-fg-accent" href={`/${locale}/forgot`}>
          {say("reset.askAgain")}
        </Link>
      ) : null}
      <form.Submit size="lg" shimmer className="w-full">
        {say("reset.submit")}
      </form.Submit>
    </form.Form>
  );
}
