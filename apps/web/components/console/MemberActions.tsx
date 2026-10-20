"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { ConfirmButton } from "@krizaka/ui/confirm-button";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

/** Pause or restore one member's access (two presses); the page refreshes from the server after. */
export function MemberActions({ id, status, role }: { id: string; status: "ACTIVE" | "PAUSED"; role: "MEMBER" | "ADMIN" }) {
  const { say } = useSay();
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const act = useMutation({
    mutationFn: (what: "pause" | "restore") => krizakaFetch(`/api/admin/members/${id}/${what}`, { method: "POST" }),
    onSuccess: () => router.refresh(),
    onError: (error) => setProblem(say(`errors.${errorKey(error)}`)),
  });
  if (role === "ADMIN") return null;
  const paused = status === "PAUSED";
  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmButton variant={paused ? "secondary" : "danger"} size="sm" confirmLabel={paused ? say("admin.member.restoreConfirm") : say("admin.member.pauseConfirm")} loading={act.isPending} onConfirm={() => act.mutate(paused ? "restore" : "pause")}>
        {paused ? say("admin.member.restore") : say("admin.member.pause")}
      </ConfirmButton>
      {problem ? <Alert tone="danger">{problem}</Alert> : null}
    </div>
  );
}
