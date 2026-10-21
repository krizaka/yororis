import type { DefaultAvatar } from "@krizaka/ui/avatar";

/** The default avatars a member can choose from (the set of @krizaka/ui: a silhouette or the brand's gradient, in six tones). */
export const AVATAR_KEYS = [1, 2, 3, 4, 5, 6].flatMap((tone) => [`person-${tone}`, `plain-${tone}`]);

export const isAvatarKey = (v: unknown): v is string => typeof v === "string" && AVATAR_KEYS.includes(v);

/** The `defaultAvatar` of @krizaka/ui for a member: their choice, else the tone their id gives. */
export function avatarOf(member: { id: string; avatar?: string | null }): DefaultAvatar {
  const choice = member.avatar && isAvatarKey(member.avatar) ? /^(person|plain)-([1-6])$/.exec(member.avatar) : null;
  return choice ? { brand: "yororis", kind: choice[1] as "person" | "plain", tone: Number(choice[2]) } : { brand: "yororis", seed: member.id };
}
