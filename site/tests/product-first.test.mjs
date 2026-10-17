// Product first, Orazaka as the engine (krizaka-com AGENTS.md section 2.1): on Yororis' site the product is the subject
// of the hero and the cards; Orazaka is named only as the engine — the guardrails and the "not" sections, never the
// hero or the cards.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messages = { en: JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8")), fr: JSON.parse(readFileSync(join(root, "messages/fr.json"), "utf8")) };
const texts = (n) => (typeof n === "string" ? [n] : n && typeof n === "object" ? Object.values(n).flatMap(texts) : []);

for (const l of ["en", "fr"]) {
  test(`${l}: the hero and the cards never name Orazaka`, () => {
    const m = messages[l];
    for (const t of texts([m.hero, m.what, m.cta, m.meta])) assert.doesNotMatch(t, /orazaka/i, t);
  });
  test(`${l}: the guardrails make Yororis the subject, with the engine named as the proof`, () => {
    const lead = messages[l].how.guards.lead;
    assert.match(lead, /^Yororis/);
    assert.match(lead, /Orazaka/);
  });
}
