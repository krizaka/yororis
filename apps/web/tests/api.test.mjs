// The API on the fictional cast, called as the browser would (the route handlers are plain functions of a Request).
import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { issue, verify, sameOrigin, cookieHeader } = await import("../lib/token.ts");
const store = await import("../lib/store.ts");
const signIn = await import("../app/api/auth/password/route.ts");
const me = await import("../app/api/me/route.ts");
const members = await import("../app/api/admin/members/route.ts");
const member = await import("../app/api/admin/members/[id]/route.ts");
const pause = await import("../app/api/admin/members/[id]/pause/route.ts");
const restore = await import("../app/api/admin/members/[id]/restore/route.ts");

const HOST = "127.0.0.1:3400";
const call = (path, { method = "GET", body, cookie, origin = `http://${HOST}` } = {}) =>
  new Request(`http://${HOST}${path}`, { method, headers: { host: HOST, ...(method !== "GET" ? { origin } : {}), ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
const login = async (email, password = "a-demo-password-1") => {
  const res = await signIn.POST(call("/api/auth/password", { method: "POST", body: { email, password } }));
  return { res, json: await res.json(), cookie: /(yororis_auth=[^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1] };
};
const ctx = (id) => ({ params: Promise.resolve({ id }) });
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test.beforeEach(() => store.resetStore());

test("the cookie is signed, expires, and cannot be forged", () => {
  const t = issue(ID(2), 1_000_000);
  assert.equal(verify(t, 1_000_000), ID(2));
  assert.equal(verify(t, 1_000_000 + 9 * 3600 * 1000), null);
  assert.equal(verify(`${t}x`), null);
  assert.equal(verify(`${Buffer.from(JSON.stringify({ sub: ID(1), exp: 9e9 })).toString("base64url")}.${t.split(".")[1]}`), null);
  assert.match(cookieHeader(t), /HttpOnly; SameSite=Lax/);
  assert.match(cookieHeader(null), /Max-Age=0/);
});

test("writes must come from this origin", () => {
  assert.equal(sameOrigin(call("/x", { method: "POST" })), true);
  assert.equal(sameOrigin(call("/x", { method: "POST", origin: "https://evil.example" })), false);
});

test("sign-in: the same 401 for a wrong address and a wrong password, a cookie for the right one", async () => {
  const wrong = await login("marie-eve@demo.yororis.test", "not-the-password-0");
  const unknown = await login("nobody@demo.yororis.test");
  assert.equal(wrong.res.status, 401);
  assert.deepEqual(wrong.json, unknown.json);
  const right = await login("marie-eve@demo.yororis.test");
  assert.equal(right.res.status, 200);
  assert.ok(right.cookie);
});

test("sign-in is limited: the eleventh try for an address is a 429", async () => {
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await login("lina@demo.yororis.test", "not-the-password-0")).res.status);
  assert.deepEqual(statuses.slice(10), [429, 429]);
});

test("a member reads and changes their own record; nobody else's", async () => {
  const { cookie } = await login("samir@demo.yororis.test");
  assert.equal((await (await me.GET(call("/api/me", { cookie }))).json()).member.email, "samir@demo.yororis.test");
  const patched = await me.PATCH(call("/api/me", { method: "PATCH", cookie, body: { name: "Sam", subtitles: false } }));
  assert.equal((await patched.json()).member.name, "Sam");
  assert.equal((await me.PATCH(call("/api/me", { method: "PATCH", cookie, body: { role: "ADMIN" } }))).status, 400);
  assert.equal((await me.GET(call("/api/me"))).status, 401);
});

test("the administration answers organisers only", async () => {
  const person = await login("jordan@demo.yororis.test");
  assert.equal((await members.GET(call("/api/admin/members", { cookie: person.cookie }))).status, 403);
  assert.equal((await members.GET(call("/api/admin/members"))).status, 401);
  const organiser = await login("demo-admin@demo.yororis.test");
  const list = await (await members.GET(call("/api/admin/members?size=3&sort=name&dir=asc", { cookie: organiser.cookie }))).json();
  assert.equal(list.rows.length, 3);
  assert.ok(list.total > 3);
  assert.ok(list.rows[0].name <= list.rows[1].name);
  const found = await (await members.GET(call("/api/admin/members?search=marie&status=ACTIVE", { cookie: organiser.cookie }))).json();
  assert.equal(found.rows.length, 1);
  assert.ok(list.rows.every((r) => !("subtitles" in r)));
});

test("pause ends access at once, restore brings it back, and both are logged", async () => {
  const organiser = await login("demo-admin@demo.yororis.test");
  const person = await login("noor@demo.yororis.test");
  assert.equal((await pause.POST(call("/x", { method: "POST", cookie: organiser.cookie }), ctx(ID(6)))).status, 200);
  assert.equal((await me.GET(call("/api/me", { cookie: person.cookie }))).status, 401);
  assert.equal((await login("noor@demo.yororis.test")).res.status, 403);
  assert.equal((await pause.POST(call("/x", { method: "POST", cookie: organiser.cookie }), ctx(ID(6)))).status, 409);
  assert.equal((await restore.POST(call("/x", { method: "POST", cookie: organiser.cookie }), ctx(ID(6)))).status, 200);
  assert.equal((await login("noor@demo.yororis.test")).res.status, 200);
  const detail = await (await member.GET(call("/x", { cookie: organiser.cookie }), ctx(ID(6)))).json();
  assert.ok(["paused", "restored"].every((a) => detail.activity.some((l) => l.action === a)));
  assert.equal((await pause.POST(call("/x", { method: "POST", cookie: organiser.cookie }), ctx(ID(1)))).status, 409, "an organiser cannot be paused");
  assert.equal((await member.GET(call("/x", { cookie: organiser.cookie }), ctx("not-a-uuid"))).status, 404);
});

test("deleting my account removes me and clears the cookie", async () => {
  const { cookie } = await login("theo@demo.yororis.test");
  const res = await me.DELETE(call("/api/me", { method: "DELETE", cookie }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie") ?? "", /Max-Age=0/);
  assert.equal(store.findByEmail("theo@demo.yororis.test"), undefined);
  assert.equal((await me.GET(call("/api/me", { cookie }))).status, 401);
});
