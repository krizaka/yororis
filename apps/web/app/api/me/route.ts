import { NextResponse } from "next/server";
import { z } from "zod";

import { isAvatarKey } from "@/lib/avatars";
import { dbConfigured } from "@/lib/db";
import { done, fail, requireMember } from "@/lib/http";
import { deleteAccount, updateProfile } from "@/lib/profile";
import { record, remove } from "@/lib/store";
import { cookieHeader } from "@/lib/token";

const Patch = z
  .object({ name: z.string().trim().min(1).max(40), locale: z.enum(["en", "fr"]), subtitles: z.boolean(), calmMotion: z.boolean(), avatar: z.string().refine(isAvatarKey).nullable() })
  .partial()
  .strict();

const view = (m: { id: string; email: string; name: string; locale: string; subtitles: boolean; calmMotion: boolean; organisation: string; avatar?: string | null; consented?: boolean }) => ({ id: m.id, email: m.email, name: m.name, locale: m.locale, subtitles: m.subtitles, calmMotion: m.calmMotion, organisation: m.organisation, avatar: m.avatar ?? null, consented: m.consented ?? true });

/** The signed-in member: name, language, the two display choices, the organisation. */
export async function GET(req: Request) {
  const r = await requireMember(req);
  return "refusal" in r ? r.refusal : done({ member: view(r.member) });
}

/** Changes the member's name, language or display choices. */
export async function PATCH(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "INVALID_PAYLOAD");
  if (dbConfigured()) {
    const updated = await updateProfile(r.member.id, parsed.data);
    return updated ? done({ member: view(updated) }) : fail(404, "NOT_FOUND");
  }
  Object.assign(r.member, parsed.data);
  return done({ member: view(r.member) });
}

/** Deletes the member's account at once: everything held about them is removed; the cookie is cleared. */
export async function DELETE(req: Request) {
  const r = await requireMember(req);
  if ("refusal" in r) return r.refusal;
  if (dbConfigured()) await deleteAccount(r.member.id);
  else {
    record("deleted", "member", null);
    remove(r.member.id);
  }
  const res = NextResponse.json({ success: true, deleted: true });
  res.headers.append("Set-Cookie", cookieHeader(null));
  return res;
}
