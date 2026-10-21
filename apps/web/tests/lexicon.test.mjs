// The Yororis lexicon (company/prompts-yororis.md §2.1, column "jamais") on every word of the member space: the messages,
// the names of files and routes, and the identifiers of the code. One exception is written out, because it denies: the presence's disclosure.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const NEVER = [
  /th[ée]rap/i, /\bpsy/i, /psycholog/i, /\bsoigne|\bsoins?\b|\bcare\b|\bcure\b|gu[ée]ri/i, /\btreat/i, /traitement/i, /diagnos/i,
  /clinic/i, /m[ée]dica/i, /\bpatient/i, /s[ée]ance/i, /consultation/i, /coach/i, /compagn/i,
  /coming soon/i, /bient[oô]t/i, /\bbeta\b|\bb[êe]ta\b/i, /wait ?list|waiting list|liste d.attente/i, /early access|acc[èe]s anticip/i,
  /sign[- ]?up|s'inscrire|inscription|inscri(?:s|vez)/i, /pr[ée]command|pre-?order|\blaunch|lancement/i, /\bhuman\b|humaine/i,
  /\bsessions?\b/i, /\bquota|cr[ée]dit|limite atteinte|\bstreak|\brewards?\b|\bbadges?\b|\bunlock|d[ée]bloquer/i,
  /dossier|historique clinique|profil psychologique|\bsuivi\b|[ée]valuation|bilan/i, /\bb[ée]n[ée]ficiaire|\busager|\bpatient/i,
  /mood score|score [ée]motionnel|emotion detect|d[ée]tection d.[ée]motion|sentiment analysis|humeur d[ée]tect[ée]e|on a remarqu[ée] que/i,
  /\b24\/7\b|tu me manques|\bi miss you\b|\bje t.aime\b/i, /suicid/i,
];


// The presence's disclosure (§2.1 « Ce qu'elle dit toujours », ★): the word is allowed here because the sentence DENIES it.
const DISCLOSURE = { en: "I'm not a therapist and not an emergency service.", fr: "Je ne suis ni thérapeute ni un service d'urgence." };

const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : Object.values(v).flatMap(strings));
const messages = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fr: JSON.parse(readFileSync("messages/fr.json", "utf8")) };

for (const l of ["en", "fr"]) {
  test(`lexicon: no "never" word in any message (${l})`, () => {
    for (const raw of strings(messages[l])) {
      const s = raw.replace(DISCLOSURE[l], "");
      for (const re of NEVER) assert.ok(!re.test(s), `${re} in message "${raw}" (${l})`);
    }
  });
}

test("lexicon: the disclosure is used exactly where it should be (the presence's opening, once per language)", () => {
  for (const l of ["en", "fr"]) assert.equal(strings(messages[l]).filter((s) => s.includes(DISCLOSURE[l])).length, 1);
});

test("lexicon: no file name, route or identifier of the code speaks the language of care", () => {
  const files = execSync("git ls-files --cached --others --exclude-standard .", { encoding: "utf8" }).split("\n").filter(Boolean).filter((f) => !/\.(json|lock)$/.test(f) && !f.startsWith("tests/"));
  const DOMAIN = [/therap/i, /patient/i, /clinic/i, /treatment/i, /diagnos/i, /mood_?score/i, /emotion/i, /sentiment/i, /\brisk/i];
  for (const f of files) {
    for (const re of DOMAIN) assert.ok(!re.test(f), `${re} in the path ${f}`);
    const src = readFileSync(f, "utf8");
    // "session" is an HTTP word, allowed in the sign-in code only (lib/token.ts, lib/auth.ts, lib/env.ts) — nowhere else.
    if (!/^lib\/(token|auth|env)\.ts$/.test(f)) assert.ok(!/\bsession/i.test(src), `"session" in ${f}`);
    for (const re of DOMAIN) assert.ok(!re.test(src), `${re} in ${f}`);
  }
});
