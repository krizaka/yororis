// The Moment in a real browser, on a phone (360 px) and a desktop, dark and light, against a stand-in for Orazaka's edge.
// Needs `npm run build` first and Chromium (`npx playwright install chromium`). Run: npm run test:e2e
// Proves what a unit test cannot: the lines to call are on the screen at 360 px in every state, and the pack's fixed crisis
// reply reaches the screen as sent. With E2E_SHOTS=<dir> it also writes screenshots (never into the repository).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const APP = "http://127.0.0.1:3400";
const EDGE_PORT = 4010;
const CRISIS_TEXT = "Je m'arrête là, parce que ce que vous venez d'écrire compte plus que l'exercice en cours. Des personnes formées écoutent, gratuitement et tout de suite :";
const RESOURCE = { region: "CA-QC", label: "Ligne québécoise de prévention du suicide", contact: "1 866 APPELLE", availability: "En tout temps", sourceUrl: "https://www.quebec.ca/", verifiedOn: "2026-10-11" };
const FIXED_EN = JSON.parse(readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8")).console.moment.crisisFixed;
const CRISIS_CUES = ["envie de mourir", "kill myself"];
const CLIP = `/api/v1/voice/clips/3f2a9c1e-7b1d-4c55-9a0e-0123456789ab?expires=${Math.floor(Date.now() / 1000) + 300}&signature=e2e0123456789abcdefABCDEF_-`;
/** A short sine, 16 kHz mono 16-bit: the stand-in for a spoken sentence. */
function wav(ms = 900) {
  const n = Math.floor((16000 * ms) / 1000);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(16000, 24);
  buf.writeUInt32LE(32000, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 330 * i) / 16000) * 9000 * (0.6 + 0.4 * Math.sin(i / 900))), 44 + i * 2);
  return buf;
}
// The portraits are on the CDN: the run answers them with a small picture, so it needs no network and tests the page, not the CDN.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const sse = (events) => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");

// The stand-in edge: installs once, and answers a turn like the voice turn does (sentences, or the fixed reply on a cue).
const edge = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString("utf8");
  if (req.url === "/api/v1/studios/installations") return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify([{ id: "sum-1", studioKey: "e2e-summary" }]));
  if (req.url === "/api/v1/studios/installations/sum-1/runs") return res.writeHead(202, { "content-type": "application/json" }).end(JSON.stringify({ id: "run-e2e", status: "RUNNING" }));
  if (req.url === "/api/v1/studios/runs/run-e2e") return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: "run-e2e", status: "SUCCEEDED", outputs: [{ key: "summary", type: "JSON", value: JSON.stringify({ themes: ["tired evenings", "no time for myself"], whatHelped: "Naming what weighs most.", smallStep: "Ask for a quarter of an hour.", bringTo: ["Evenings with the kids"], locale: "en" }) }] }));
  if (req.url.startsWith("/api/v1/studios/")) return res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ id: "inst-e2e" }));
  if (req.url.startsWith("/api/v1/voice/clips/")) return res.writeHead(200, { "content-type": "audio/wav" }).end(wav());
  if (req.url === "/api/v1/voice/turns") {
    const spoken = body.includes('name="audio"');
    const cue = CRISIS_CUES.some((c) => body.toLowerCase().includes(c));
    res.writeHead(200, { "content-type": "text/event-stream" });
    const heard = spoken ? [["transcript", { text: "I spoke out loud tonight", seconds: 1 }]] : [];
    return res.end(
      cue
        ? sse([["safety.crisis", { response: "r", resource: RESOURCE, text: CRISIS_TEXT }], ["done", {}]])
        : sse([...heard, ["sentence", { index: 0, text: "I hear you.", audio: { url: CLIP, durationMs: 900 } }], ["sentence", { index: 1, text: "What weighs the most right now?", audio: { url: CLIP, durationMs: 900 } }], ["done", {}]]),
    );
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
  APP_VOICE_TURNS: "on",
  APP_MOMENT_TURNS: "20",
  APP_MOMENTS_PER_DAY: "20",
  APP_MOMENTS_PER_WEEK: "50",
};
// E2E_DEV=1 runs against `next dev` (no build needed, slower first loads); CI and the default use the production build.
const dev = process.env.E2E_DEV === "1";
const server = spawn("npx", ["next", dev ? "dev" : "start", "-H", "127.0.0.1", "-p", "3400"], { env: dev ? { ...env, NODE_ENV: "development" } : env, stdio: "ignore", detached: true });
setTimeout(() => {
  console.log("watchdog: the run took more than 5 minutes");
  process.exit(2);
}, 300_000).unref();
const stop = () => {
  // The whole group: `npx` starts the server as its child, and a stale server would hold the port for the next run.
  try {
    process.kill(-server.pid);
  } catch {
    server.kill();
  }
  edge.close();
};
process.on("exit", stop);
for (let i = 0; i < 120; i++) {
  if (await fetch(`${APP}/en/sign-in`).then((r) => r.ok, () => false)) break;
  await sleep(500);
}

const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
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

// Each context signs in as the next member of the fictional cast: sign-in is rate limited per address (10 tries), and a moment is per member.
const CAST = ["marie-eve", "samir", "jordan", "camille", "noor", "etienne", "lina", "theo"].map((n) => `${n}@demo.yororis.test`);
let signIns = 0;

async function open(viewport, scheme, locale = "en", email = null, path = "moment") {
  const context = await browser.newContext({ viewport, colorScheme: scheme, locale, permissions: ["microphone"] });
  context.setDefaultTimeout(process.env.E2E_DEV === "1" ? 40_000 : 15_000);
  if (process.env.E2E_REAL_PORTRAITS !== "1") await context.route("**/people/personas/**", (route) => route.fulfill({ contentType: "image/png", body: PNG }));
  const login = await context.request.post(`${APP}/api/auth/password`, { data: { email: email ?? CAST[signIns++ % CAST.length], password: "e2e-demo-password" }, headers: { origin: APP } });
  assert.equal(login.status(), 200);
  // The cookie is Secure in production (tested in api.test.mjs); this run is plain http on 127.0.0.1, so it is set by hand.
  const value = /yororis_auth=([^;]+)/.exec(login.headers()["set-cookie"] ?? "")?.[1];
  assert.ok(value, "no sign-in cookie");
  await context.clearCookies();
  await context.addCookies([{ name: "yororis_auth", value, url: APP, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  current = page;
  await page.goto(`${APP}/${locale}/${path}`);
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
      await page.waitForFunction(() => document.querySelector(".presence-face img")?.complete === true, null, { timeout: 15_000 });
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
      assert.equal((await panel.getByText(FIXED_EN).innerText()).trim(), FIXED_EN, "the fixed text is shown as written (the cut-off ran before the model)");
      assert.equal(await page.getByPlaceholder("Say what is on your mind").count(), 0, "the conversation is closed");
      await assertLinesVisible(page, viewport, `with the crisis panel (${tag})`);
      if (shots) await page.screenshot({ path: `${shots}/crisis-${device}-${scheme}.png` });
      await context.close();
    });
  }
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  await step(`${device}: hold to talk, the words are captioned, the presence answers aloud, and the voice can be turned off`, async () => {
    const { context, page } = await open(viewport, "dark");
    await page.getByText("Noor", { exact: true }).first().click();
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: /Begin a moment with Noor/ }).click();
    await page.getByRole("log").waitFor();
    const talk = page.getByTestId("hold-to-talk");
    await talk.waitFor();
    await assertLinesVisible(page, viewport, `with the microphone button (${device})`);
    const box = await talk.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width, "the talk button is cut at the side");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.getByText(/Listening… let go to send/).waitFor();
    await page.waitForTimeout(1200);
    await page.mouse.up();
    await page.getByText("I spoke out loud tonight").waitFor();
    await page.getByText("What weighs the most right now?").waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="voice-line"]')?.getAttribute("data-speaking") === "true", null, { timeout: 8000 });
    // The face follows the real signal while it speaks, wears the AI mark, and stays inside the screen.
    await page.waitForFunction(() => Number.parseFloat(document.querySelector('[data-testid="presence-face"]')?.style.getPropertyValue("--presence-energy") || "0") > 0.02, null, { timeout: 8000 });
    const face = await page.getByTestId("presence-face").boundingBox();
    assert.ok(face && face.x >= 0 && face.x + face.width <= viewport.width + 0.5, "the face is cut at the side");
    assert.ok(await page.getByTestId("presence-face").getByText("AI", { exact: true }).isVisible(), "the AI mark is on the face");
    assert.equal(await page.getByTestId("presence-face").getAttribute("data-speaking"), "true");
    await page.waitForFunction(() => document.querySelector(".presence-face img")?.complete === true, null, { timeout: 15_000 });
    if (shots) await page.screenshot({ path: `${shots}/speaking-${device}.png` });
    await page.waitForFunction(() => document.querySelector('[data-testid="voice-line"]')?.getAttribute("data-speaking") === "false", null, { timeout: 12000 });
    // Voice off: the captions and the answer stay, the sound does not.
    await page.getByRole("button", { name: "Voice on" }).click();
    await page.getByRole("button", { name: "Voice off" }).waitFor();
    await page.getByPlaceholder("Say what is on your mind").fill("And one more thing");
    await page.keyboard.press("Enter");
    await page.getByText("And one more thing").waitFor();
    await page.waitForTimeout(1500);
    assert.equal(await page.getByTestId("voice-line").getAttribute("data-speaking"), "false", "the voice is off");
    await assertLinesVisible(page, viewport, `after speaking (${device})`);
    await page.getByRole("button", { name: "End this moment" }).click();
    await context.close();
  });
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  await step(`${device}: the end of the moment — nothing kept, what is left, come back later; the lines to call stay whole`, async () => {
    const { context, page } = await open(viewport, "dark");
    await page.getByText("Léa", { exact: true }).first().click();
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: /Begin a moment with Léa/ }).click();
    await page.getByRole("log").waitFor();
    await page.getByPlaceholder("Say what is on your mind").fill("Work was heavy this week");
    await page.keyboard.press("Enter");
    await page.getByText("What weighs the most right now?").waitFor();
    await page.getByRole("button", { name: "End this moment" }).click();
    const closing = page.getByTestId("moment-closing");
    await closing.waitFor();
    await closing.getByText(/Nothing was saved/).waitFor();
    assert.ok(await closing.getByTestId("come-back-later").getByText(/Moments left: \d+ today, \d+ this week\./).isVisible(), "what is left is shown");
    assert.equal(await closing.getByRole("button", { name: /keep|Copy|Download/i }).count(), 0, "nothing is kept, copied or downloaded");
    await assertLinesVisible(page, viewport, `at the end (${device})`);
    if (shots) await page.screenshot({ path: `${shots}/closing-${device}.png` });
    await context.close();
  });
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  await step(`${device}: the organiser's console of moments — figures and a table, counts only, never a word`, async () => {
    const { context, page } = await open(viewport, "dark", "en", "demo-admin@demo.yororis.test", "admin/moments");
    const root = page.getByTestId("moments-console");
    await root.waitFor();
    await root.getByText("Average length").waitFor();
    await root.getByRole("table").waitFor();
    await root.getByText("Closed by the person").first().waitFor();
    const text = await root.innerText();
    assert.ok(!/Work was heavy|I spoke out loud|Sometimes I want|And one more thing|What weighs/.test(text), "a word of a moment reached the console");
    assert.ok(!/@demo\.yororis|Marie|Samir/.test(text), "a name reached the console");
    assert.ok(await root.getByText("The lines to call were shown").count() > 0, "the lines shown are counted");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `the console scrolls sideways by ${overflow}px`);
    if (shots) await page.screenshot({ path: `${shots}/console-moments-${device}.png` });
    await context.close();
    const member = await open(viewport, "dark", "en", "lina@demo.yororis.test", "admin/moments");
    // The 404 is in the HTML the server sends, not painted by scripts after the load event (that raced a slow runner: an empty body).
    const raw = await member.context.request.get(`${APP}/en/admin/moments`);
    assert.equal(raw.status(), 404, "a member gets a 404 on the console");
    assert.ok((await raw.text()).includes("This page is not here"), "the 404 says so in the HTML itself");
    await member.page.getByRole("heading", { name: "This page is not here" }).waitFor();
    assert.equal(await member.page.getByTestId("moments-console").count(), 0, "a member must not see the console");
    await member.context.close();
  });
}

await step("the face holds still under reduced motion, and breathes otherwise", async () => {
  const { context, page } = await open(VIEWPORTS.phone, "dark");
  await page.getByText("Léa", { exact: true }).first().click();
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /Begin a moment with Léa/ }).click();
  const body = page.locator(".presence-face__body");
  await body.waitFor();
  const animation = () => body.evaluate((el) => getComputedStyle(el).animationName);
  assert.equal(await animation(), "presence-breathe", "the face does not breathe");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await animation(), "none", "the face moves under prefers-reduced-motion");
  await page.getByRole("button", { name: "End this moment" }).click();
  await context.close();
});

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
