import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { messages, page, CONTACT, KRIZAKA, version } from "./build.mjs";

// The reviewed texts (krizaka-com messages `site.yororis.reviewed.*`, lexicon §2.1 "Statut" and "Ce que Yororis n'est pas"):
// they deny the care vocabulary, so they are the one thing the lexicon check does not read. A change is a review.
const REVIEWED_SHA = "ab5ef48655d616a7";
const reviewedOf = (l) => [messages[l].reviewed.construction, ...messages[l].reviewed.isNot, messages[l].reviewed.isNotRule];

// company/prompts-yororis.md §2.1, column "jamais" (words that name care, a relationship, a promise of service).
const NEVER = [
  /th[ée]rap/i, /\bpsy/i, /psycholog/i, /\bsoigne|\bsoins?\b|\bcare\b|\bcure\b|gu[ée]ri/i, /\btreat/i, /traitement/i, /diagnos/i,
  /clinic/i, /m[ée]dica/i, /\bpatient/i, /s[ée]ance/i, /consultation/i, /coach/i, /compagn/i,
  /coming soon/i, /bient[oô]t/i, /\bbeta\b|\bb[êe]ta\b/i, /wait ?list|waiting list|liste d.attente/i, /early access|acc[èe]s anticip/i,
  /sign[- ]?up|s'inscrire|inscription|inscri(?:s|vez)/i, /pr[ée]command|pre-?order|\blaunch|lancement/i, /\bhuman\b|humaine/i,
];

for (const l of ["en", "fr"]) {
  test(`reviewed texts unchanged (${l})`, () => {
    const sha = createHash("sha256").update(JSON.stringify([reviewedOf("en"), reviewedOf("fr")])).digest("hex").slice(0, 16);
    assert.equal(sha, REVIEWED_SHA, "a reviewed text changed: re-review it (krizaka-com `npm run lexicon -- --accept-review`) and update REVIEWED_SHA");
  });

  test(`lexicon: no "never" word on the page (${l})`, () => {
    let html = page(l);
    for (const t of reviewedOf(l)) html = html.replaceAll(t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"), "");
    const text = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ");
    for (const re of NEVER) assert.ok(!re.test(text), `${re} found in the ${l} page text`);
    const m = messages[l];
    for (const k of ["title", "description", "eyebrow", "lead", "isNotTitle", "cta", "product"]) for (const re of NEVER) assert.ok(!re.test(m[k]), `${re} in ${k} (${l})`);
  });

  test(`page contract (${l}): one call to action, footer, version, no form or script`, () => {
    const html = page(l);
    assert.equal((html.match(/class="cta"/g) ?? []).length, 1);
    assert.ok(html.includes(`href="${CONTACT}"`));
    assert.equal(CONTACT, "https://www.krizaka.com/contact?topic=yororis");
    assert.ok(html.includes(`<a href="${KRIZAKA}">${messages[l].product}</a>`));
    assert.ok(html.includes(version()));
    assert.ok(!/<form|<script|<input|<button/i.test(html));
    assert.ok(html.includes("prefers-color-scheme: light"));
    assert.ok(html.includes("<svg") && html.includes('aria-label="Yororis"'));
    for (const t of reviewedOf(l).filter((t) => !t.includes("'"))) assert.ok(html.includes(t.replace(/&/g, "&amp;")), t);
  });
}

test("both languages have the same shape", () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.fr).sort());
  assert.equal(messages.en.reviewed.isNot.length, messages.fr.reviewed.isNot.length);
});
