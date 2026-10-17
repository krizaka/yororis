// A crawl of the key screens of the member space, phone and desktop, dark and light, in both languages for the home:
// no cut content, no sideways scroll, no empty screen, no console error, no error page. It is the `ui.themes-devices` evidence of the
// dev checklist. Two modes:
//   npm run test:e2e              builds nothing: starts `next start` itself (after `npm run build`) with the cast and a made-up password;
//   E2E_BASE_URL=https://qa.yororis.com E2E_PASSWORD=… node tests/e2e/crawl.mjs    the same crawl against a live deployment, as the QA accounts
//                                 (the password is read from the environment and never printed).
// With E2E_SHOTS=<dir> it writes one screenshot per screen (never into the repository: they go to Bunny, pr-assets/yororis/dev-preview/).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const LIVE = Boolean(process.env.E2E_BASE_URL);
const APP = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3400").replace(/\/$/, "");
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-demo-password";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

let server = null;
if (!LIVE) {
  const dev = process.env.E2E_DEV === "1";
  const env = { ...process.env, NODE_ENV: dev ? "development" : "production", APP_RELEASE_APPROVAL: "e2e-only", AUTH_SESSION_SECRET: "e2e-secret-0123456789abcdef0123456789", AUTH_DEMO_PASSWORD: PASSWORD };
  server = spawn("npx", ["next", dev ? "dev" : "start", "-H", "127.0.0.1", "-p", "3400"], { env, stdio: "ignore", detached: true });
  for (let i = 0; i < 120; i++) {
    if (await fetch(`${APP}/en/sign-in`).then((r) => r.ok, () => false)) break;
    await sleep(500);
  }
}
const stop = () => {
  if (!server) return;
  try {
    process.kill(-server.pid);
  } catch {
    server.kill();
  }
};
process.on("exit", stop);
setTimeout(() => {
  console.log("watchdog: the crawl took more than 5 minutes");
  process.exit(2);
}, 300_000).unref();

const shots = process.env.E2E_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
const VIEWPORTS = { phone: { width: 360, height: 740 }, desktop: { width: 1280, height: 800 } };
const MEMBER = "lina@demo.yororis.test";
const ORGANISER = "demo-admin@demo.yororis.test";

// What each account sees: [path, name]. The organiser's console is for the organiser only.
const SCREENS = {
  signedOut: [["/en/sign-in", "sign-in"], ["/fr/sign-in", "sign-in-fr"]],
  member: [["/en", "home"], ["/fr", "home-fr"], ["/en/moment", "moment"], ["/en/account", "account"]],
  organiser: [["/en/admin/members", "members"]],
};

async function signIn(context, email) {
  const base = LIVE ? APP : APP;
  const login = await context.request.post(`${base}/api/auth/password`, { data: { email, password: PASSWORD }, headers: { origin: APP } });
  assert.equal(login.status(), 200, `sign-in as ${email} answered ${login.status()}`);
  const value = /yororis_auth=([^;]+)/.exec(login.headers()["set-cookie"] ?? "")?.[1];
  assert.ok(value, "no sign-in cookie");
  // Plain http on 127.0.0.1 cannot hold a Secure cookie: set by hand there; live (https) the browser keeps its own.
  if (!LIVE) {
    await context.clearCookies();
    await context.addCookies([{ name: "yororis_auth", value, url: APP, httpOnly: true, sameSite: "Lax" }]);
  }
}

let failed = 0;
async function crawl(device, scheme, account, email, screens) {
  const context = await browser.newContext({ viewport: VIEWPORTS[device], colorScheme: scheme, locale: "en" });
  context.setDefaultTimeout(process.env.E2E_DEV === "1" ? 40_000 : 20_000);
  await context.route("**/people/personas/**", (route) => route.fulfill({ contentType: "image/png", body: PNG }));
  if (email) await signIn(context, email);
  for (const [path, name] of screens) {
    const tag = `${device}/${scheme}/${account}: ${path}`;
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (e) => problems.push(`page error: ${e.message.slice(0, 120)}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/favicon|Failed to load resource.*(401|404)/.test(m.text())) problems.push(`console error: ${m.text().slice(0, 120)}`);
    });
    try {
      const res = await page.goto(`${APP}${path}`);
      assert.ok(res && res.status() < 400, `answered ${res?.status()}`);
      await page.locator("main, [role=main], form").first().waitFor();
      await page.waitForLoadState("networkidle").catch(() => undefined);
      const body = await page.locator("body").innerText();
      assert.ok(body.trim().length > 40, "the screen is empty");
      assert.ok(!/This page couldn.t load|Application error|Internal Server Error/i.test(body), "an error page");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `the page scrolls sideways by ${overflow}px`);
      // A control beyond the edge is a defect unless it sits in a region that scrolls sideways on purpose (the account's section chips).
      const cut = await page.evaluate(() => {
        const scrolls = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth) return true; } return false; };
        return [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && !scrolls(el); }).map((el) => (el.textContent ?? "").trim().slice(0, 30));
      });
      assert.equal(cut.length, 0, `a control is cut at the side: ${cut.join(" | ")}`);
      assert.deepEqual(problems, [], "the console is not clean");
      if (shots) await page.screenshot({ path: `${shots}/${name}-${device}-${scheme}.png`, fullPage: false });
      console.log(`ok   ${tag}`);
    } catch (e) {
      failed += 1;
      console.log(`FAIL ${tag}\n     ${String(e.message).split("\n")[0]}${problems.length ? ` | ${problems.join(" | ")}` : ""}`);
    }
    await page.close();
  }
  await context.close();
}

for (const device of Object.keys(VIEWPORTS)) {
  for (const scheme of ["dark", "light"]) {
    await crawl(device, scheme, "signed out", null, SCREENS.signedOut);
    await crawl(device, scheme, "member", MEMBER, SCREENS.member);
    await crawl(device, scheme, "organiser", ORGANISER, SCREENS.organiser);
  }
}

await browser.close();
stop();
if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
process.exit(0);
