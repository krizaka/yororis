// The Moment in a real browser, on a phone (360 px) and a desktop, dark and light, against a stand-in for Orazaka's edge.
// Needs `npm run build` first and Chromium (`npx playwright install chromium`). Run: npm run test:e2e
// Proves what a unit test cannot: the lines to call are on the screen at 360 px in every state, and the pack's fixed crisis
// reply reaches the screen as sent. With E2E_SHOTS=<dir> it also writes screenshots (never into the repository).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const APP = "http://127.0.0.1:3400";
const EDGE_PORT = 4010;
const CRISIS_TEXT = "Je m'arrête là, parce que ce que vous venez d'écrire compte plus que l'exercice en cours. Des personnes formées écoutent, gratuitement et tout de suite :";
const RESOURCE = { region: "CA-QC", label: "Ligne québécoise de prévention du suicide", contact: "1 866 APPELLE", availability: "En tout temps", sourceUrl: "https://www.quebec.ca/", verifiedOn: "2026-10-11" };
const CRISIS_CUES = ["envie de mourir", "kill myself"];
const sse = (events) => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");

// The stand-in edge: installs once, and answers a turn like the voice turn does (sentences, or the fixed reply on a cue).
const edge = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString("utf8");
  if (req.url === "/api/v1/studios/installations") return res.writeHead(200, { "content-type": "application/json" }).end("[]");
  if (req.url.startsWith("/api/v1/studios/")) return res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ id: "inst-e2e" }));
  if (req.url === "/api/v1/voice/turns") {
    const cue = CRISIS_CUES.some((c) => body.toLowerCase().includes(c));
    res.writeHead(200, { "content-type": "text/event-stream" });
    return res.end(cue ? sse([["safety.crisis", { response: "r", resource: RESOURCE, text: CRISIS_TEXT }], ["done", {}]]) : sse([["sentence", { index: 0, text: "I hear you." }], ["sentence", { index: 1, text: "What weighs the most right now?" }], ["done", {}]]));
  }
  res.writeHead(404).end();
});
await new Promise((ok) => edge.listen(EDGE_PORT, "127.0.0.1", ok));

const env = {
  ...process.env,
  NODE_ENV: "production",
  APP_RELEASE_APPROVAL: "e2e-only",
  AUTH_SESSION_SECRET: "e2e-secret-0123456789abcdef0123456789",
  AUTH_DEMO_PASSWORD: "e2e-demo-password",
  AI_API_URL: `http://127.0.0.1:${EDGE_PORT}`,
  AI_API_KEY: "e2e-service-key",
  APP_MOMENTS_PER_DAY: "20",
  APP_MOMENTS_PER_WEEK: "50",
};
const server = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", "3400"], { env, stdio: "ignore" });
setTimeout(() => {
  console.log("watchdog: the run took more than 5 minutes");
  process.exit(2);
}, 300_000).unref();
const stop = () => {
  server.kill();
  edge.close();
};
process.on("exit", stop);
for (let i = 0; i < 60; i++) {
  if (await fetch(`${APP}/en/sign-in`).then((r) => r.ok, () => false)) break;
  await sleep(500);
}

const browser = await chromium.launch();
const shots = process.env.E2E_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
let failed = 0;
let current = null;
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${name}\n     ${e.message.split("\n").slice(0, 3).join(" | ")}`);
    if (current) {
      console.log(`     page says: ${(await current.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300)}`);
      if (shots) await current.screenshot({ path: `${shots}/FAIL-${name.replace(/\W+/g, "-").slice(0, 40)}.png` }).catch(() => {});
    }
    await current?.context().close().catch(() => {});
  }
};

async function open(viewport, scheme, locale = "en") {
  const context = await browser.newContext({ viewport, colorScheme: scheme, locale });
  context.setDefaultTimeout(15_000);
  const login = await context.request.post(`${APP}/api/auth/password`, { data: { email: "marie-eve@demo.yororis.test", password: "e2e-demo-password" }, headers: { origin: APP } });
  assert.equal(login.status(), 200);
  // The cookie is Secure in production (tested in api.test.mjs); this run is plain http on 127.0.0.1, so it is set by hand.
  const value = /yororis_auth=([^;]+)/.exec(login.headers()["set-cookie"] ?? "")?.[1];
  assert.ok(value, "no sign-in cookie");
  await context.clearCookies();
  await context.addCookies([{ name: "yororis_auth", value, url: APP, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  current = page;
  await page.goto(`${APP}/${locale}/moment`);
  return { context, page };
}

/** The three lines are on the screen (inside the viewport), whole, and tappable. */
async function assertLinesVisible(page, viewport, where) {
  const strip = page.getByTestId("help-now");
  await strip.waitFor();
  for (const href of ["tel:988", "sms:988", "tel:811"]) {
    const link = strip.locator(`a[href="${href}"]`);
    await link.waitFor();
    const box = await link.boundingBox();
    assert.ok(box, `${href} has no box ${where}`);
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 0.5, `${href} is cut at the side ${where}`);
    assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 0.5, `${href} is outside the screen ${where}`);
    assert.ok(box.height >= 28, `${href} is too small to tap ${where}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `the page scrolls sideways by ${overflow}px ${where}`);
}

const VIEWPORTS = { phone: { width: 360, height: 740 }, desktop: { width: 1280, height: 800 } };

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const scheme of ["dark", "light"]) {
    const tag = `${device}/${scheme}`;
    await step(`${tag}: the lines to call are on the screen at every stage of a moment`, async () => {
      const { context, page } = await open(viewport, scheme);
      await assertLinesVisible(page, viewport, `before a moment (${tag})`);
      if (shots) await page.screenshot({ path: `${shots}/choose-${device}-${scheme}.png` });
      await page.getByText("Léa", { exact: true }).first().click();
      await page.getByRole("checkbox").click();
      await page.getByRole("button", { name: /Begin a moment with Léa/ }).click();
      await page.getByRole("log").waitFor();
      await assertLinesVisible(page, viewport, `in a moment (${tag})`);
      await page.getByPlaceholder("Say what is on your mind").fill("Work was heavy this week");
      await page.keyboard.press("Enter");
      await page.getByText("What weighs the most right now?").waitFor();
      assert.ok(await page.getByText("Work was heavy this week").isVisible(), "the person's words are captioned");
      assert.ok(await page.getByRole("timer").first().isVisible(), "the timer is shown");
      assert.ok(await page.getByText("AI", { exact: true }).first().isVisible(), "the AI mark is shown");
      await assertLinesVisible(page, viewport, `after an answer (${tag})`);
      if (shots) await page.screenshot({ path: `${shots}/moment-${device}-${scheme}.png` });
      await page.getByRole("button", { name: "End this moment" }).click();
      await page.getByText("This moment has ended").waitFor();
      await assertLinesVisible(page, viewport, `after the moment (${tag})`);
      await context.close();
    });

    await step(`${tag}: a risk cue shows the pack's fixed reply and the lines, nothing else`, async () => {
      const { context, page } = await open(viewport, scheme);
      await page.getByText("Samuel", { exact: true }).first().click();
      await page.getByRole("checkbox").click();
      await page.getByRole("button", { name: /Begin a moment with Samuel/ }).click();
      await page.getByRole("log").waitFor();
      await page.getByPlaceholder("Say what is on your mind").fill("Sometimes I want to kill myself");
      await page.keyboard.press("Enter");
      const panel = page.getByTestId("crisis-panel");
      await panel.waitFor();
      assert.equal((await panel.getByText(CRISIS_TEXT).innerText()).trim(), CRISIS_TEXT, "the reply is shown as sent");
      assert.equal(await page.getByPlaceholder("Say what is on your mind").count(), 0, "the conversation is closed");
      await assertLinesVisible(page, viewport, `with the crisis panel (${tag})`);
      if (shots) await page.screenshot({ path: `${shots}/crisis-${device}-${scheme}.png` });
      await context.close();
    });
  }
}

await step("french: the lines read « Besoin d'aide maintenant ? » and « Appeler le 9-8-8 » at 360 px", async () => {
  const { context, page } = await open(VIEWPORTS.phone, "dark", "fr");
  await assertLinesVisible(page, VIEWPORTS.phone, "in French");
  assert.ok(await page.getByText("Besoin d'aide maintenant ?").isVisible());
  assert.ok(await page.getByRole("link", { name: "Appeler le 9-8-8" }).isVisible());
  await context.close();
});

await browser.close();
stop();
if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
process.exit(0);
