// Québec compliance of the landing (#101): the neighbour concept, no care or health wording, the company's public identification and the
// person in charge of personal information in the footer (a role and a contact, nothing personal), the French contact links.
// Runs on the BUILT html (`npm run build` first).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const page = (file) => parse(readFileSync(join(out, file), "utf8"));
const PAGES = { en: "index.html", fr: "fr/index.html" };
const text = (l) => {
  const body = page(PAGES[l]).querySelector("body");
  body.querySelectorAll("script,style,svg,.yo-changelog").forEach((n) => n.remove());
  return body.textContent.replace(/\s+/g, " ");
};

for (const l of ["en", "fr"]) {
  test(`${l}: the footer carries the company's public identification, the privacy contact and the non-retention line`, () => {
    const footer = page(PAGES[l]).querySelector("footer");
    assert.ok(footer, "a footer");
    const t = footer.textContent.replace(/\s+/g, " ");
    assert.match(t, /Technologies Krizaka Inc\./);
    assert.match(t, /NEQ 1182652231/);
    assert.match(t, /Montréal, Québec/);
    assert.match(t, l === "fr" ? /Responsable de la protection des renseignements personnels/ : /Person in charge of the protection of personal information/);
    assert.ok(footer.querySelector('a[href="mailto:contact@krizaka.com"]'), "the contact e-mail of the person in charge");
    assert.match(t, l === "fr" ? /Aucune conversation n'est conservée/ : /No conversation is kept/);
  });

  test(`${l}: no home address, no personal phone, no banking data in the page`, () => {
    const t = text(l);
    assert.ok(!/\b\d{2,5},? (rue|avenue|boulevard|street|ave|blvd)\b|\bH\d[A-Z] ?\d[A-Z]\d\b/i.test(t), "no street address or postal code");
    assert.ok(!/(?<![-\d])\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\d)/.test(t), "no phone number (the crisis lines are 9-8-8 and 811)");
    assert.ok(!/\bIBAN\b|\bSWIFT\b|\btransit\b|\bNIF\b/i.test(t));
  });

  test(`${l}: the page speaks of a neighbour, not of care: no health-care, therapist or Health Canada wording`, () => {
    const t = text(l);
    for (const re of [/Health Canada|Sant[ée] Canada/i, /th[ée]rap/i, /\bcare\b|\bsoins?\b/i, /clinic|clinique/i, /bien-?être|wellbeing|wellness/i, /\bmood\b|\bhumeur\b(?! )/i]) {
      // « no measure of your mood » / « aucune mesure d'humeur » say what is NOT done: allowed in that form only.
      const cleaned = t.replace(/no measure of your mood|aucune mesure d'humeur|ni mesure de votre humeur/gi, "").replace(/No mood measure|Aucune mesure d'humeur/gi, "");
      assert.ok(!re.test(cleaned), `${re} in the ${l} page`);
    }
    assert.match(t, l === "fr" ? /voisin/i : /neighbour/i);
  });
}

test("the French page links to the French contact page of krizaka.com; the English page to the English one", () => {
  const hrefs = (l) => page(PAGES[l]).querySelectorAll("a").map((a) => a.getAttribute("href") ?? "").filter((h) => /^https:\/\/www\.krizaka\.com\/(fr\/)?contact/.test(h));
  const fr = hrefs("fr");
  assert.ok(fr.length > 0);
  for (const h of fr) assert.ok(h.startsWith("https://www.krizaka.com/fr/contact"), h);
  for (const h of hrefs("en")) assert.ok(h.startsWith("https://www.krizaka.com/contact"), h);
});
