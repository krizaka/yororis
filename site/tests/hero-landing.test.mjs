// The home is the LandingPage template of @krizaka/ui, hero first: a calm hero with the crane, a face-and-voice preview
// (stylised portrait with its permanent "AI" mark, a waveform, sample captions) marked "under construction", the crisis lines
// in the first 360 px screen. Runs on the built HTML (`npm run build` first) and on the source.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const messages = { en: JSON.parse(read("messages/en.json")), fr: JSON.parse(read("messages/fr.json")) };
const dom = (l) => parse(read(l === "en" ? "out/index.html" : "out/fr/index.html"));

test("the home is a LandingPage with a visual, features and a closing call", () => {
  const home = read("components/Home.tsx");
  assert.ok(home.includes('from "@krizaka/ui/landing-page"'));
  for (const prop of ["eyebrow=", "visual={<MomentTake", "visualLabel=", "features={", "closing={{"]) assert.ok(home.includes(prop), prop);
  assert.ok(read("components/MomentTake.tsx").includes("IntersectionObserver"));
  assert.ok(read("components/MomentTake.tsx").includes("prefers-reduced-motion"));
  assert.ok(read("components/MomentTake.tsx").includes("DeviceFrame"));
  assert.ok(!home.includes("<PageHero"));
});

for (const l of ["en", "fr"]) {
  test(`the hero (${l}): the crane in the bar's colours, the crisis lines before the take, the real Moment take in a phone frame`, () => {
    const d = dom(l);
    const header = d.querySelector("main header");
    assert.ok(header, "a hero header in main");
    assert.ok(header.querySelector("h1"));
    assert.ok(header.querySelector('a[href="tel:988"]') && header.querySelector('a[href="tel:811"]'), "the crisis lines are in the hero");
    const html = header.outerHTML;
    assert.ok(html.indexOf("yo-crisis") < html.indexOf("yo-take"), "the crisis lines come before the take (phone first)");
    assert.ok(header.querySelector(".yo-hero-crane svg"), "the crane");
    const t = messages[l].hero.take;
    const card = header.querySelector(".yo-take");
    assert.ok(card, "the take");
    assert.ok(card.querySelector('[data-device="phone"]'), "in a phone frame");
    const v = card.querySelector("video");
    assert.ok(v, "a video");
    for (const a of ["muted", "loop", "playsinline"]) assert.ok(v.hasAttribute(a), a);
    assert.ok(!v.hasAttribute("autoplay"), "never autoplays before it is seen");
    assert.match(v.getAttribute("poster"), /^https:\/\/krizaka-assets\.b-cdn\.net\/site\/products\/yororis\/tour\/moment-fr-phone\.[0-9a-f]{10}\.jpg$/);
    assert.match(v.getAttribute("src") ?? v.querySelector("source")?.getAttribute("src"), /^https:\/\/krizaka-assets\.b-cdn\.net\/site\/products\/yororis\/tour\/moment-fr-phone\.[0-9a-f]{10}\.mp4$/);
    assert.ok(card.text.includes(t.note), "says what it is: recorded locally, fictional cast, under construction");
    assert.ok(card.getAttribute("aria-label") === t.aria || card.querySelector(`[aria-label="${t.aria}"]`), "described for assistive technology");
    assert.ok(!/Aperçu|Preview/.test(card.text), "no longer a preview");
    assert.equal(card.querySelectorAll("img, audio, input").length, 0);
  });

  test(`the take stays honest (${l}): « under construction » is said, the cast is fictional, nothing is offered`, () => {
    const t = messages[l].hero.take;
    assert.match(t.note, /construction/i);
    assert.match(t.note, /fictiv|fictional/i);
  });

  test(`the four features and the honest steps are on the page (${l})`, () => {
    const d = dom(l);
    const f = d.getElementById("features");
    assert.ok(f);
    for (const i of messages[l].features.items) assert.ok(f.text.includes(i.title) && f.text.includes(i.text), i.title);
    assert.equal(d.getElementById("what")?.closest("section").querySelectorAll("ol > li").length, 4);
  });
}

test("the take has its own styles", () => {
  const css = read("app/globals.css");
    assert.ok(css.includes(".yo-take"));
});
