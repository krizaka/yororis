"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { Button } from "@krizaka/ui/button";
import { Checkbox } from "@krizaka/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

/** The first sign-in's one question: 18 or older, and the terms. Both boxes before the button works. */
export function ConsentForm() {
  const { say, locale } = useSay();
  const router = useRouter();
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => krizakaFetch("/api/me/consent", { method: "POST", json: { adult: true, terms: true } }),
    onSuccess: () => {
      router.replace(`/${locale}`);
      router.refresh();
    },
    onError: (e) => setProblem(say(`errors.${errorKey(e)}`)),
  });
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3 text-sm text-fg">
        <Checkbox checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
        {say("welcome.adult")}
      </label>
      <label className="flex items-center gap-3 text-sm text-fg">
        <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
        {say("welcome.terms")}
      </label>
      <Link className="text-sm font-semibold text-fg-accent" href={`/${locale}/terms`} target="_blank">
        {say("welcome.termsLink")}
      </Link>
      <p className="text-sm text-fg-secondary">{say("welcome.hint")}</p>
      {problem ? <Alert tone="danger">{problem}</Alert> : null}
      <Button size="lg" className="w-full" disabled={!adult || !terms} loading={send.isPending} onClick={() => send.mutate()}>
        {say("welcome.submit")}
      </Button>
    </div>
  );
}
