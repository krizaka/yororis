"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { Button } from "@krizaka/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

/** Your neighbour: not chosen, like in real life; they sometimes move; you may go and see another one, once a day. Nothing of any chat is shown or kept. */
export function NeighbourCard({ name, line, moved }: { name: string; line: string; moved: { from: string; to: string } | null }) {
  const { say } = useSay();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const go = useMutation({
    mutationFn: () => krizakaFetch("/api/me/neighbour/move", { method: "POST", json: {} }),
    onSuccess: () => {
      setNote(null);
      router.refresh();
    },
    onError: (e) => setNote(say(`errors.${errorKey(e)}`)),
  });
  const seen = useMutation({ mutationFn: () => krizakaFetch("/api/me/neighbour/seen", { method: "POST", json: {} }), onSuccess: () => setRead(true) });
  return (
    <div className="flex flex-col gap-3" data-testid="neighbour-card">
      {moved && !read ? (
        <Alert tone="info">
          {say("dashboard.neighbour.note", { from: moved.from, to: moved.to })}{" "}
          <Button size="sm" variant="ghost" onClick={() => seen.mutate()}>
            {say("dashboard.neighbour.ok")}
          </Button>
        </Alert>
      ) : null}
      <p className="font-display text-xl font-extrabold text-fg">{name}</p>
      <p className="text-sm text-fg-secondary">{line}</p>
      <p className="text-sm text-fg-secondary">{say("dashboard.neighbour.intro")}</p>
      {note ? <Alert tone="info">{note}</Alert> : null}
      <div>
        <Button size="sm" variant="secondary" loading={go.isPending} onClick={() => go.mutate()}>
          {say("dashboard.neighbour.goSee")}
        </Button>
      </div>
    </div>
  );
}
