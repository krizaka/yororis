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
  for (const prop of ["eyebrow=", "visual={<PresencePreview", "visualLabel=", "features={", "closing={{"]) assert.ok(home.includes(prop), prop);
  assert.ok(read("components/PresencePreview.tsx").includes('from "@krizaka/ui/waveform"'));
  assert.ok(!home.includes("<PageHero"));
});

for (const l of ["en", "fr"]) {
  test(`the hero (${l}): the crane, the crisis lines before the status, the preview marked under construction with a permanent AI mark`, () => {
    const d = dom(l);
    const header = d.querySelector("main header");
    assert.ok(header, "a hero header in main");
    assert.ok(header.querySelector("h1"));
    assert.ok(header.querySelector('a[href="tel:988"]') && header.querySelector('a[href="tel:811"]'), "the crisis lines are in the hero");
    const html = header.outerHTML;
    assert.ok(html.indexOf("yo-crisis") < html.indexOf("yo-presence"), "the crisis lines come before the preview (phone first)");
    assert.ok(header.querySelector(".yo-hero-crane svg"), "the crane");
    const p = messages[l].hero.preview;
    const card = header.querySelector(".yo-presence");
    assert.ok(card, "the preview card");
    assert.ok(card.text.includes(p.label), "marked: preview, under construction");
    assert.ok(card.text.includes(p.mark), "the permanent AI mark");
    assert.ok(card.querySelector("[data-waveform], .kz-waveform, [class*=waveform]") || /waveform/i.test(card.outerHTML), "the waveform");
    for (const c of p.captions) assert.ok(card.text.includes(c), c);
    assert.ok(card.text.includes(p.note), "says it is a sample");
  });

  test(`the preview borrows no claim: no screen of the product, no real person, captions from the lexicon's approved lines (${l})`, () => {
    const card = dom(l).querySelector(".yo-presence");
    assert.equal(card.querySelectorAll("img, video, audio, button, input").length, 0, "no picture, no player, no control");
    assert.ok(messages[l].hero.preview.captions.length === 3);
  });

  test(`the four features and the honest steps are on the page (${l})`, () => {
    const d = dom(l);
    const f = d.getElementById("features");
    assert.ok(f);
    for (const i of messages[l].features.items) assert.ok(f.text.includes(i.title) && f.text.includes(i.text), i.title);
    assert.equal(d.getElementById("what")?.closest("section").querySelectorAll("ol > li").length, 4);
  });
}

test("the crisis lines are the first thing under the lead on a phone, and the card rests under reduced motion", () => {
  const css = read("app/globals.css");
  assert.ok(css.includes(".yo-presence"));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[^}]*\.yo-cap/s);
});
