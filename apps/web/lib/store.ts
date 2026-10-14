/**
 * The local store of the member space: a fictional cast, in memory, rebuilt at every start. No database, nothing
 * written to disk, nobody real (construction mode, docs/FRAMEWORK.md §5: "fictional demo cast", invitation only).
 * Passwords are never stored: a sign-in compares with the demo password of the environment, in constant time.
 */
export type Role = "MEMBER" | "ADMIN";
export type Status = "ACTIVE" | "PAUSED";

export interface Member {
  id: string;
  email: string;
  name: string;
  organisation: string;
  role: Role;
  status: Status;
  locale: "en" | "fr";
  subtitles: boolean;
  calmMotion: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

export const ORGANISATION = "Demo organisation (fictional)";
const day = (d: number) => new Date(Date.UTC(2026, 8, 1 + d)).toISOString();

const cast = (): Member[] => [
  ["demo-admin@demo.yororis.test", "Demo organiser", "ADMIN", "en"],
  ["marie-eve@demo.yororis.test", "Marie-Ève (demo)", "MEMBER", "fr"],
  ["samir@demo.yororis.test", "Samir (demo)", "MEMBER", "en"],
  ["jordan@demo.yororis.test", "Jordan (demo)", "MEMBER", "en"],
  ["camille@demo.yororis.test", "Camille (demo)", "MEMBER", "fr"],
  ["noor@demo.yororis.test", "Noor (demo)", "MEMBER", "en"],
  ["etienne@demo.yororis.test", "Étienne (demo)", "MEMBER", "fr"],
  ["lina@demo.yororis.test", "Lina (demo)", "MEMBER", "en"],
  ["theo@demo.yororis.test", "Théo (demo)", "MEMBER", "fr"],
].map(([email, name, role, locale], i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  email: email as string,
  name: name as string,
  organisation: ORGANISATION,
  role: role as Role,
  status: "ACTIVE" as Status,
  locale: locale as "en" | "fr",
  subtitles: true,
  calmMotion: false,
  createdAt: day(i * 2),
  lastSeenAt: i % 3 === 0 ? null : day(i * 2 + 5),
}));

export interface AuditLine {
  id: string;
  at: string;
  action: "sign_in" | "sign_in_refused" | "paused" | "restored" | "deleted";
  actor: string;
  target: string | null;
}

const holder = globalThis as unknown as { __yororisStore?: { members: Member[]; audit: AuditLine[] } };
const store = () => (holder.__yororisStore ??= { members: cast(), audit: [] });

export const resetStore = () => {
  holder.__yororisStore = { members: cast(), audit: [] };
};
export const findByEmail = (email: string) => store().members.find((m) => m.email === email.trim().toLowerCase());
export const findById = (id: string) => store().members.find((m) => m.id === id);
export const record = (action: AuditLine["action"], actor: string, target: string | null) => {
  store().audit.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), action, actor, target });
  store().audit.length = Math.min(store().audit.length, 200);
};
export const auditFor = (id: string) => store().audit.filter((a) => a.target === id).slice(0, 12);

export interface MemberQuery {
  search?: string;
  status?: string[];
  sort: "name" | "createdAt" | "lastSeenAt" | "status";
  dir: "asc" | "desc";
  page: number;
  size: number;
}

export function listMembers(q: MemberQuery): { rows: Member[]; total: number } {
  const s = q.search?.trim().toLowerCase();
  let rows = store().members.filter((m) => (!s || m.name.toLowerCase().includes(s) || m.email.includes(s)) && (!q.status?.length || q.status.includes(m.status)));
  const key = q.sort;
  rows = [...rows].sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * (q.dir === "asc" ? 1 : -1));
  return { total: rows.length, rows: rows.slice((q.page - 1) * q.size, q.page * q.size) };
}

export const touch = (m: Member) => {
  m.lastSeenAt = new Date().toISOString();
};
export function remove(id: string): boolean {
  const s = store();
  const before = s.members.length;
  s.members = s.members.filter((m) => m.id !== id);
  return s.members.length < before;
}
