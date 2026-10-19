// The presence's face: a generated, fictitious person with the AI mark, calm when asked, and voices that exist in Orazaka's catalogue.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { PRESENCES, presenceOf } = await import("../lib/presences.ts");
const { MEDIA_CDN, portrait } = await import("../lib/media.ts");

const messages = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fr: JSON.parse(readFileSync("messages/fr.json", "utf8")) };
// The voices of `wellbeing/listening/listening.json` (orazaka-packs): a presence names a catalogued voice, never a model.
const CATALOGUED = { "fr": ["piper-fr-siwis-medium", "piper-fr-medium", "piper-fr-tom-medium"], "en": ["piper-en-low", "piper-en-medium-ryan", "piper-en-medium-lessac"] };
// The fictitious people of the shared library (people/personas/ui): generated, they do not exist.
const LIBRARY = ["ada", "camille", "noor", "tomas"];

test("three presences, each with its own face from the library of fictitious people", () => {
  assert.equal(PRESENCES.length, 3);
  assert.equal(new Set(PRESENCES.map((p) => p.id)).size, 3);
  assert.equal(new Set(PRESENCES.map((p) => p.face)).size, 3, "two presences share a face");
  for (const p of PRESENCES) {
    assert.ok(LIBRARY.some((name) => p.face === portrait(name)), `${p.id}: ${p.face} is not a portrait of the library`);
    assert.ok(p.face.startsWith(`${MEDIA_CDN}/people/personas/ui/`), "a portrait is on the media CDN, never in the repository");
    assert.ok(CATALOGUED.fr.includes(p.voices.fr) && CATALOGUED.en.includes(p.voices.en), `${p.id}: a voice is not catalogued`);
    assert.equal(presenceOf(p.id), p);
  }
});

test("each presence speaks with its own voice in each language, and with its own face", () => {
  for (const lang of ["fr", "en"]) assert.equal(new Set(PRESENCES.map((p) => p.voices[lang])).size, PRESENCES.length - (lang === "en" ? 0 : 0), `two presences share a ${lang} voice`);
  assert.equal(new Set(PRESENCES.map((p) => p.face)).size, PRESENCES.length);
});

test("the picker is Krizaka UI's ChoiceGrid: a radio group with arrow keys, each tile carrying the AI mark", () => {
  const view = readFileSync("components/console/MomentView.tsx", "utf8");
  assert.match(view, /from "@krizaka\/ui\/choice-grid"/);
  assert.match(view, /badge: say\("moment\.aiMark"\)/);
  assert.ok(!/type="radio"/.test(view), "no hand-made radio list");
});

test("no image or video is committed: the portraits are not in the repository", () => {
  const tracked = execSync("git ls-files --cached --others --exclude-standard .", { encoding: "utf8" }).split("\n");
  assert.deepEqual(tracked.filter((f) => /\.(png|jpe?g|webp|gif|avif|mp4|webm)$/i.test(f)), []);
});

// The component is drawn in a real browser by tests/e2e/moment.mjs (AI mark, portrait, energy while speaking); here, what its source and
// its messages promise.
test("the face always wears the AI mark, in both languages, and names itself an AI presence", () => {
  const src = readFileSync("components/console/PresenceFace.tsx", "utf8");
  assert.match(src, /say\("moment\.aiMark"\)/);
  assert.match(src, /role="img"/);
  assert.match(src, /aria-label=\{say\("moment\.aiNote"/);
  assert.match(src, /data-speaking=\{speaking\}/);
  assert.match(src, /data-calm=\{calm\}/);
  assert.equal(messages.en.console.moment.aiMark, "AI");
  assert.equal(messages.fr.console.moment.aiMark, "IA");
  assert.match(messages.en.console.moment.aiNote, /AI presence, not a person and not an emergency service/);
  assert.match(messages.fr.console.moment.aiNote, /présence IA, pas une personne et pas un service d'urgence/);
});

test("the moment screen draws the face, and the choice list shows each portrait", () => {
  const view = readFileSync("components/console/MomentView.tsx", "utf8");
  assert.match(view, /<PresenceFace presence=\{presence\} speaking=\{speech\.speaking\} energy=\{speech\.energy\} calm=\{calmMotion\}/);
  assert.match(view, /<Avatar size="xl" src=\{p\.face\}/);
  const page = readFileSync("app/[locale]/(app)/(console)/moment/page.tsx", "utf8");
  assert.match(page, /calmMotion=\{member\?\.calmMotion \?\? false\}/);
});

test("the motion is calm under prefers-reduced-motion and under the member's choice, and uses the tokens only", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const face = css.slice(css.indexOf(".presence-face {"));
  assert.match(face, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.presence-face__body \{ animation: none; \}/);
  assert.match(face, /\.presence-face\[data-calm="true"\] \.presence-face__body \{ animation: none; \}/);
  assert.match(face, /var\(--kz-accent\)/);
  assert.doesNotMatch(face, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, "a hard-coded colour in the face's CSS");
});

test("the content security policy lets the portraits in and nothing else from outside", () => {
  const cfg = readFileSync("next.config.mjs", "utf8");
  assert.match(cfg, /img-src 'self' data: blob: \$\{cdn\}/);
  assert.doesNotMatch(cfg, /img-src[^`"]*\*/);
});
