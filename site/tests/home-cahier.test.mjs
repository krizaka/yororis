// The home in the Cahier identity (krizaka-ui ADR-004): restrained, no glow, no mascot ornament, no em dash outside the
// reviewed texts (kept word for word), one discreet « Powered by Orazaka » line.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/globals.css", "utf8");
const home = readFileSync("components/Home.tsx", "utf8");
const messages = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fr: JSON.parse(readFileSync("messages/fr.json", "utf8")) };

test("no glow: no drop-shadow, no radial halo in the stylesheet", () => {
  assert.ok(!/drop-shadow|radial-gradient/.test(css));
});
test("no mascot quote and no meta row on the home", () => {
  assert.ok(!/MascotQuote|MetaRow/.test(home));
});
test("no em dash outside the reviewed texts", () => {
  for (const l of ["en", "fr"]) {
    const rest = JSON.stringify({ ...messages[l], reviewed: undefined });
    assert.ok(!rest.includes("—"), `${l} still has an em dash`);
  }
});
test("one discreet Powered by Orazaka line, in both languages", () => {
  assert.equal(messages.en.not.powered, "Powered by Orazaka.");
  assert.equal(messages.fr.not.powered, "Propulsé par Orazaka.");
  assert.equal((home.match(/m\.not\.powered/g) ?? []).length, 1);
});
