"use client";

import { krizakaFetch, useMutation } from "@krizaka/query";
import { Alert } from "@krizaka/ui/alert";
import { Avatar } from "@krizaka/ui/avatar";
import { Button } from "@krizaka/ui/button";
import { SettingsSection } from "@krizaka/ui/settings-layout";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AVATAR_KEYS, avatarOf } from "@/lib/avatars";
import { errorKey } from "@/lib/client";
import { useSay } from "@/lib/i18n-client";

/** The member's picture: one of the Krizaka default avatars (a silhouette or the brand's gradient, six tones), through `Avatar` and `defaultAvatar`. */
export function AvatarPicker({ id, name, avatar }: { id: string; name: string; avatar: string | null }) {
  const { say } = useSay();
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(avatar);
  const [state, setState] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const patch = useMutation({ mutationFn: (value: string | null) => krizakaFetch("/api/me", { method: "PATCH", json: { avatar: value } }) });
  const choose = (value: string | null) =>
    patch.mutate(value, {
      onSuccess: () => {
        setChosen(value);
        setState({ tone: "success", text: say("account.avatar.saved") });
        router.refresh();
      },
      onError: (e) => setState({ tone: "danger", text: say(`errors.${errorKey(e)}`) }),
    });
  return (
    <SettingsSection id="avatar" title={say("account.avatar.title")} description={say("account.avatar.description")}>
      <div className="flex items-center gap-4">
        <Avatar size="xl" alt={name} defaultAvatar={avatarOf({ id, avatar: chosen })} />
        <Button size="sm" variant="ghost" disabled={patch.isPending || chosen === null} onClick={() => choose(null)}>
          {say("account.avatar.default")}
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={say("account.avatar.title")}>
        {AVATAR_KEYS.map((key, i) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={chosen === key}
              aria-label={say("account.avatar.option", { n: i + 1 })}
              disabled={patch.isPending}
              onClick={() => choose(key)}
              className="outline-offset-2 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Avatar size="md" alt="" defaultAvatar={avatarOf({ id, avatar: key })} />
            </button>
          </li>
        ))}
      </ul>
      {state ? <Alert tone={state.tone}>{state.text}</Alert> : null}
    </SettingsSection>
  );
}
