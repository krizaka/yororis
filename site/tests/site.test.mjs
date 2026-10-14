// Runs on the BUILT html (`npm run build` first): the lexicon, the reviewed texts, the contract of a construction-mode page.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "out");
const messages = { en: JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8")), fr: JSON.parse(readFileSync(join(root, "messages/fr.json"), "utf8")) };
const PAGES = { en: "index.html", fr: "fr/index.html" };
const CONTACT = "https://www.krizaka.com/contact?topic=yororis";

assert.ok(existsSync(join(out, "index.html")), "site/out is missing: run `npm run build` before `npm test`");
const html = (l) => readFileSync(join(out, PAGES[l]), "utf8");
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const textOf = (h) => decode(h.replace(/<(style|script|svg)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : Object.values(v).flatMap(strings));
const shape = (v) => (typeof v === "string" ? "s" : Array.isArray(v) ? v.map(shape) : Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])])));

// The reviewed texts (krizaka-com `site.yororis.reviewed.*`, lexicon §2.1): they deny the vocabulary, so the lexicon check
// does not read them. A change is a review.
const REVIEWED_SHA = "ab5ef48655d616a7";
const reviewedOf = (l) => [messages[l].reviewed.construction, ...messages[l].reviewed.isNot, messages[l].reviewed.isNotRule];

// company/prompts-yororis.md §2.1, column "jamais" (words that name care, a relationship, a promise of service).
const NEVER = [
  /th[ée]rap/i, /\bpsy/i, /psycholog/i, /\bsoigne|\bsoins?\b|\bcare\b|\bcure\b|gu[ée]ri/i, /\btreat/i, /traitement/i, /diagnos/i,
  /clinic/i, /m[ée]dica/i, /\bpatient/i, /s[ée]ance/i, /consultation/i, /coach/i, /compagn/i,
  /coming soon/i, /bient[oô]t/i, /\bbeta\b|\bb[êe]ta\b/i, /wait ?list|waiting list|liste d.attente/i, /early access|acc[èe]s anticip/i,
  /sign[- ]?up|s'inscrire|inscription|inscri(?:s|vez)/i, /pr[ée]command|pre-?order|\blaunch|lancement/i, /\bhuman\b|humaine/i,
];
const RULE_OF_THE_BUILD = /construction mode|mode construction/i; // names the rule that forbids sign-up; allowed with "no"/"aucune"

for (const l of ["en", "fr"]) {
  test(`reviewed texts unchanged (${l})`, () => {
    const sha = createHash("sha256").update(JSON.stringify([reviewedOf("en"), reviewedOf("fr")])).digest("hex").slice(0, 16);
    assert.equal(sha, REVIEWED_SHA, "a reviewed text changed: re-review it (krizaka-com `npm run lexicon -- --accept-review`) and update REVIEWED_SHA");
  });

  test(`lexicon: no "never" word in the built page text or in any message (${l})`, () => {
    let text = textOf(html(l));
    for (const t of reviewedOf(l)) text = text.replaceAll(t, "");
    // the one phrase that names the rule forbidding sign-up and deployment (construction mode, FRAMEWORK §5)
    const allowed = l === "en" ? "no deployment, no sign-up, no production variable" : "aucun déploiement, aucune inscription, aucune variable de production";
    text = text.replaceAll(allowed, "");
    for (const re of NEVER) assert.ok(!re.test(text), `${re} found in the ${l} page text`);
    const own = { ...messages[l], reviewed: undefined, how: { ...messages[l].how, own: { ...messages[l].how.own, items: messages[l].how.own.items.filter((s) => !s.includes(allowed)) } } };
    for (const s of strings(JSON.parse(JSON.stringify(own)))) for (const re of NEVER) assert.ok(!re.test(s), `${re} in message "${s}" (${l})`);
    assert.ok(RULE_OF_THE_BUILD.test(textOf(html(l))));
  });

  test(`reviewed texts are on the page, word for word (${l})`, () => {
    const text = textOf(html(l));
    for (const t of reviewedOf(l)) assert.ok(text.includes(t), t);
  });

  test(`contract (${l}): one action everywhere, crisis line, footer, version, document`, () => {
    const h = html(l);
    assert.ok(h.includes(`href="${CONTACT}"`));
    for (const href of h.match(/href="https:\/\/www\.krizaka\.com\/contact[^"]*"/g) ?? []) assert.equal(href, `href="${CONTACT}"`);
    for (const label of [messages[l].bar.talk]) assert.ok(textOf(h).includes(label));
    assert.ok(h.includes('href="tel:988"') && h.includes('href="tel:811"'), "the crisis lines are one tap away");
    assert.ok(/9-8-8/.test(textOf(h)) && /811/.test(textOf(h)));
    assert.ok(h.includes('<a href="https://www.krizaka.com">' + messages[l].footer.product.replace("'", "&#x27;") + "</a>"));
    assert.ok(new RegExp(`${messages[l].footer.version} \\d+\\.\\d+\\.\\d+`).test(textOf(h)), "the version is shown");
    assert.ok(h.includes(`<html lang="${l}"`));
    assert.ok(!/<form|<input|<textarea|type="email"/i.test(h), "no form");
    assert.ok(!/\/api\//.test(h), "no API call");
    assert.ok(h.includes('rel="canonical"') && /hreflang="en"/i.test(h) && /hreflang="fr"/i.test(h));
    assert.ok(h.includes('property="og:title"') && h.includes('name="description"') && h.includes('property="og:image"'));
    assert.ok(h.includes("brand-yororis"));
    for (const id of ["what", "how", "not"]) assert.ok(h.includes(`id="${id}"`), `section #${id}`);
  });
}

test("both languages have the same shape", () => {
  assert.deepEqual(shape(messages.en), shape(messages.fr));
});

test("the language switch points to the other page", () => {
  assert.ok(html("en").includes('href="/fr/"'));
  assert.ok(html("fr").includes('href="/"'));
});

test("the export is static: no server output", () => {
  const entries = readdirSync(out);
  assert.ok(!entries.includes("api") && !entries.includes("server"));
  assert.ok(existsSync(join(out, "404.html")) && existsSync(join(out, "favicon.svg")) && existsSync(join(out, "robots.txt")) && existsSync(join(out, "sitemap.xml")));
  assert.match(readFileSync(join(root, "next.config.mjs"), "utf8"), /output:\s*"export"/);
});

test("sitemap lists both languages", () => {
  const s = readFileSync(join(out, "sitemap.xml"), "utf8");
  assert.ok(s.includes("https://dev.yororis.com/") && s.includes("https://dev.yororis.com/fr/"));
});
