// Runs on the BUILT html (`npm run build` first): the lexicon, the reviewed texts, the contract of a construction-mode page.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeType, parse } from "node-html-parser";
import { familyLabels } from "@krizaka/ui/sites";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "out");
const messages = { en: JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8")), fr: JSON.parse(readFileSync(join(root, "messages/fr.json"), "utf8")) };
const PAGES = { en: "index.html", fr: "fr/index.html" };
const CONTACT = "https://www.krizaka.com/contact?topic=yororis";

assert.ok(existsSync(join(out, "index.html")), "site/out is missing: run `npm run build` before `npm test`");
// The built pages are read with a real HTML parser (node-html-parser): entities are decoded by the parser, text is the
// text nodes outside style/script/svg, links are attributes — no regex stripping or unescaping of markup.
const raw = (l) => readFileSync(join(out, PAGES[l]), "utf8");
const dom = (l) => parse(raw(l));
const textOf = (l) => {
  const parts = [];
  const walk = (n) => {
    if (n.nodeType === NodeType.TEXT_NODE) parts.push(n.text);
    else if (n.nodeType === NodeType.ELEMENT_NODE && !["style", "script", "svg"].includes(n.rawTagName?.toLowerCase())) n.childNodes.forEach(walk);
    else if (n.childNodes) n.childNodes.forEach(walk);
  };
  walk(dom(l));
  return parts.join(" ").split(/\s+/).filter(Boolean).join(" ");
};
const attr = (el, name) => Object.entries(el.attributes).find(([k]) => k.toLowerCase() === name)?.[1];
const links = (l) => dom(l).querySelectorAll("a").map((a) => ({ href: attr(a, "href"), text: a.text.trim() }));
const hostOf = (href) => { try { return new URL(href).host; } catch { return null; } };
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : Object.values(v).flatMap(strings));
const shape = (v) => (typeof v === "string" ? "s" : Array.isArray(v) ? v.map(shape) : Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])])));

// The reviewed texts (krizaka-com `site.yororis.reviewed.*`, lexicon §2.1): they deny the vocabulary, so the lexicon check
// does not read them. A change is a review.
const REVIEWED_SHA = "87fb593f75c47ed4";
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

  test(`lexicon: no "never" word in the built page text or in any message (${l})`, () => {
    let text = textOf(l);
    for (const t of reviewedOf(l)) text = text.replaceAll(t, "");
    // the one phrase that names the rule forbidding sign-up and deployment (construction mode, FRAMEWORK §5)
    const allowed = l === "en" ? "no deployment, no sign-up, no production variable" : "aucun déploiement, aucune inscription, aucune variable de production";
    text = text.replaceAll(allowed, "");
    for (const re of NEVER) assert.ok(!re.test(text), `${re} found in the ${l} page text`);
    const own = { ...messages[l], reviewed: undefined, how: { ...messages[l].how, own: { ...messages[l].how.own, items: messages[l].how.own.items.filter((s) => !s.includes(allowed)) } } };
    for (const s of strings(JSON.parse(JSON.stringify(own)))) for (const re of NEVER) assert.ok(!re.test(s), `${re} in message "${s}" (${l})`);
  });

  test(`reviewed texts are on the page, word for word (${l})`, () => {
    const text = textOf(l);
    for (const t of reviewedOf(l)) assert.ok(text.includes(t), t);
  });

  test(`contract (${l}): one action everywhere, crisis line, footer, version, document`, () => {
    const d = dom(l);
    const hrefs = links(l);
    const contact = hrefs.filter((x) => hostOf(x.href) === "www.krizaka.com" && new URL(x.href).pathname === (l === "fr" ? "/fr/contact" : "/contact"));
    assert.ok(contact.length >= 2, "the action is in the bar and at the end of the page");
    for (const x of contact) assert.equal(x.href, l === "fr" ? CONTACT.replace("/contact", "/fr/contact") : CONTACT, "every contact link is the one action, in the reader's language");
    assert.ok(textOf(l).includes(messages[l].bar.talk));
    for (const tel of ["tel:988", "tel:811"]) assert.ok(hrefs.some((x) => x.href === tel), `the crisis line ${tel} is one tap away`);
    assert.ok(/9-8-8/.test(textOf(l)) && /811/.test(textOf(l)));
    assert.ok(raw(l).includes(`>${familyLabels[l].signature.product}<`), "footer: A Krizaka product");
    assert.ok(/v\d+\.\d+\.\d+/.test(textOf(l)), "the version is shown");
    assert.equal(d.querySelector("html").getAttribute("lang"), l);
    assert.equal(d.querySelectorAll("form, input, textarea, button[type=submit]").length, 0, "no form");
    assert.ok(!hrefs.some((x) => x.href?.startsWith("/api/")), "no API call");
    assert.ok(d.querySelector('link[rel="canonical"]'), "canonical");
    const alts = d.querySelectorAll('link[rel="alternate"]').map((e) => attr(e, "hreflang"));
    assert.ok(alts.includes("en") && alts.includes("fr"), "hreflang en and fr");
    for (const p of ["og:title", "og:image"]) assert.ok(d.querySelector(`meta[property="${p}"]`), p);
    assert.ok(d.querySelector('meta[name="description"]'));
    assert.ok(d.querySelector("body").classList.contains("brand-yororis"));
    for (const id of ["what", "how", "not"]) assert.ok(d.getElementById(id), `section #${id}`);
    // One story on the LandingPage template: the promise (hero, with the crisis lines), the four things it is, the honest steps,
    // what it is not, how it is built, the call — six blocks at most.
    const blocks = d.querySelector("main > div").childNodes.filter((n) => n.nodeType === 1);
    assert.ok(blocks.length <= 7, `${blocks.length} sections on the page — seven at most (the calm crisis section is the seventh)`);
    const help = d.getElementById("help")?.closest("section");
    assert.ok(help && /9-8-8/.test(help.text) && /811/.test(help.text), "the crisis lines have their own calm section near the footer");
  });
}

test("both languages have the same shape", () => {
  assert.deepEqual(shape(messages.en), shape(messages.fr));
});

test("the language switch is the family's and points to the other page (its list opens on demand: the hrefs are in the bar's source)", () => {
  assert.equal(messages.en.otherHref, "/fr/");
  assert.equal(messages.fr.otherHref, "/");
  assert.equal(messages.en.otherName, "Français");
  assert.equal(messages.fr.otherName, "English");
});

test("the export is static: no server output", () => {
  const entries = readdirSync(out);
  assert.ok(!entries.includes("api") && !entries.includes("server"));
  assert.ok(existsSync(join(out, "404.html")) && existsSync(join(out, "favicon.svg")) && existsSync(join(out, "robots.txt")) && existsSync(join(out, "sitemap.xml")));
  assert.match(readFileSync(join(root, "next.config.mjs"), "utf8"), /output:\s*"export"/);
});

test("sitemap lists both languages", () => {
  const s = readFileSync(join(out, "sitemap.xml"), "utf8");
  const locs = parse(s).querySelectorAll("loc").map((e) => new URL(e.text.trim()));
  assert.ok(locs.length >= 2 && locs.every((u) => u.host === "www.yororis.com"));
  const paths = locs.map((u) => u.pathname);
  assert.ok(paths.includes("/") && paths.includes("/fr/"));
});

// ── Search engines and AI assistants (the Krizaka family contract, scripts/check-seo-family.mjs) ──────────────────────────
import { auditHtml, auditLlms, auditRobots, auditSitemap } from "../scripts/check-seo-family.mjs";
const HOST = "https://www.yororis.com";

test("robots.txt welcomes the AI crawlers and names the sitemap", () => {
  assert.deepEqual(auditRobots(readFileSync(join(out, "robots.txt"), "utf8"), { host: HOST }), []);
});

test("sitemap.xml: both languages, on the host, dated", () => {
  const xml = readFileSync(join(out, "sitemap.xml"), "utf8");
  assert.deepEqual(auditSitemap(xml, { host: HOST, minUrls: 2 }), []);
});

test("llms.txt: llmstxt.org shape, back to the family, and the lexicon's never-words stay out", () => {
  const text = readFileSync(join(out, "llms.txt"), "utf8");
  assert.deepEqual(auditLlms(text, { host: HOST }), []);
  for (const re of NEVER) assert.doesNotMatch(text, re, `llms.txt: ${re}`);
});

for (const l of ["en", "fr"]) {
  test(`${l}: canonical, social card with an image and JSON-LD back to the Krizaka Organization`, () => {
    const path = l === "en" ? "/" : "/fr/";
    assert.deepEqual(auditHtml(raw(l), path, { host: HOST, types: ["WebSite", "SoftwareApplication"], home: true }), []);
  });
}

test("the bar and the footer are those of an independent product: no version chip in the bar (it is in the footer), no family switcher, family={false} footer", () => {
  const bar = readFileSync(join(root, "components/Bar.tsx"), "utf8");
  assert.ok(!bar.includes("NavBar.Family"), "no family switcher, desktop or phone");
  assert.ok(!bar.includes("NavBar.Badge"), "no version chip in the bar");
  assert.match(bar, /<NavBar\.Repo /);
  assert.match(readFileSync(join(root, "components/Footer.tsx"), "utf8"), /<SiteFooter\s+current="yororis"\s+family=\{false\}[^>]*env="dev"/);
  for (const l of ["en", "fr"]) assert.match(textOf(l), /\bdev\b[^.]{0,40}v\d+\.\d+\.\d+/, `${l}: the dev badge and the version are on the page`);
});

// The member space is shown ONLY as pictures — hashed files on the CDN, never in the repository — each labelled "in
// development, not available" (AGENTS.md, "The member-space exception"), in one phone frame (StepShowcase). No link, no form leads to it.
for (const l of ["en", "fr"]) {
  test(`the member space appears as labelled phone screenshots only (${l})`, () => {
    const root = dom(l);
    const imgs = root.querySelectorAll('[data-device="phone"] img');
    assert.equal(imgs.length, 3, "three real screens in one phone frame");
    for (const img of imgs) {
      assert.match(img.getAttribute("src"), /^https:\/\/krizaka-assets\.b-cdn\.net\/site\/products\/yororis\/gallery\/[a-z]+-phone\.[0-9a-f]{10}\.webp$/, "a hashed CDN file");
    }
    assert.ok((imgs[0].getAttribute("alt") ?? "").length > 20, "the screen in view has a real alt text (the others are described when they come into view)");
    const m = messages[l].how.app;
    assert.ok(root.querySelector(".yo-shot-status")?.text.includes(m.status) || root.text.includes(m.status), "the status label sits with the pictures");
    assert.ok(root.text.includes(m.note), "the note says nothing can be opened, joined or downloaded");
    assert.equal(root.querySelectorAll("form, input, textarea").length, 0, "pictures only: no form");
  });

  // The home tells one story: how a moment goes (every step marked "under construction", no invented screen), what Yororis
  // is not, what is kept and for how long, and who reads it.
  test(`the steps are honest: four, each under construction, no picture of a flow that does not exist (${l})`, () => {
    const d = dom(l);
    const m = messages[l].what;
    const what = d.getElementById("what")?.closest("section");
    assert.ok(what, "section #what");
    assert.equal(what.querySelectorAll("ol > li").length, 4);
    for (const s of m.steps) assert.ok(what.text.includes(s.title) && what.text.includes(s.text));
    assert.ok(what.text.includes(m.labels.upcoming) && what.text.includes(m.status));
    assert.equal(what.querySelectorAll("img, video").length, 0, "no screen is shown for a step that is not built");
  });

  test(`what is kept, for how long, who reads it: three answers in the "not" section, next to the limits (${l})`, () => {
    const not = dom(l).getElementById("not")?.closest("section");
    assert.ok(not);
    for (const i of messages[l].not.privacy.items) assert.ok(not.text.includes(i.q) && not.text.includes(i.a), i.q);
    for (const t of [...messages[l].reviewed.isNot, messages[l].reviewed.isNotRule]) assert.ok(not.text.includes(t), t);
  });

  test(`the hero has a crane and no crisis panel; the page still has it, under « how it goes » and near the footer, readable and reachable (${l})`, () => {
    const d = dom(l);
    const header = d.querySelector("main header");
    assert.ok(header.querySelector("svg"), "the hero draws the crane");
    assert.ok(!header.querySelector(".yo-crisis") && !header.querySelector('a[href^="tel:"]'), "no crisis panel in the hero");
    for (const part of [header, ...d.querySelectorAll(".yo-crisis")]) assert.ok(!/—/.test(part.text), "no em dash in the hero or the crisis panel");
    const what = d.getElementById("what")?.closest("section");
    assert.ok(what?.querySelector(".yo-crisis"), "the panel is under « how it goes »");
    const help = d.getElementById("help")?.closest("section");
    assert.ok(help, "a section of its own near the footer");
    assert.ok(help.querySelector("h2"), "it has a heading");
    assert.equal(help.querySelector("h2").text.trim(), messages[l].crisis.label);
    for (const tel of ["tel:988", "tel:811"]) {
      const a = help.querySelector(`a[href="${tel}"]`);
      assert.ok(a, tel);
      assert.ok(a.getAttribute("tabindex") !== "-1", "reachable by keyboard");
    }
    const order = d.querySelectorAll("main section").map((x) => x.querySelector("[id]")?.getAttribute("id") ?? x.getAttribute("id"));
    assert.ok(order.indexOf("help") > order.indexOf("how"), "the crisis section comes after the whole story, near the footer");
    assert.match(help.querySelector(".yo-crisis").getAttribute("aria-label"), new RegExp(messages[l].crisis.aria));
  });
}

// NAV-INDEP: once deployed, Yororis is an independent product — no link to, nor mention of, another product's (or any
// other Krizaka site's) domain. Krizaka is the publisher, in the footer only ("A Krizaka product" -> www.krizaka.com).
const FOREIGN = /(?:[a-z0-9-]+\.)*(?:orazaka|orochia|yasakia|yazakia)\.com|ui\.krizaka\.com|java\.krizaka\.com/i;
// The pages, not the bundled client chunks (_next/), which ship @krizaka/ui's registry of sites.
const walkOut = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "_next" ? [] : walkOut(join(dir, e.name))) : /\.(html|txt|xml|json)$/.test(e.name) ? [join(dir, e.name)] : []));
test("independent: no built file names another product's domain, no family switcher or column is rendered", () => {
  for (const file of walkOut(out)) assert.doesNotMatch(readFileSync(file, "utf8"), FOREIGN, `${file.replace(out, "out")} links another product`);
  for (const l of ["en", "fr"]) {
    assert.ok(!raw(l).includes(familyLabels[l].family), `${l}: no “${familyLabels[l].family}” navigation`);
    assert.ok(raw(l).includes(`>${familyLabels[l].signature.product}<`), `${l}: the publisher line stays`);
  }
});

// One footer, one contentinfo: the shell renders the footer once, after the page, and nothing else renders a footer or a strip under it.
test("one footer: the shell renders it once after the children; no <footer> and no separate dev strip", () => {
  const shell = readFileSync(join(root, "components/Shell.tsx"), "utf8");
  assert.equal(shell.match(/<Footer /g)?.length, 1);
  assert.ok(shell.indexOf("{children}") < shell.indexOf("<Footer "));
  const footer = readFileSync(join(root, "components/Footer.tsx"), "utf8");
  assert.doesNotMatch(footer, /<footer\b/);
  assert.match(footer, /\{devNotice \? <span data-testid="dev-environment-notice">/);
  assert.doesNotMatch(footer, /<\/SiteFooter>\s*\{devNotice/);
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (/\.tsx$/.test(rel) && rel !== "components/Footer.tsx" && /<footer\b|<SiteFooter\b/.test(readFileSync(join(root, rel), "utf8"))) offenders.push(rel);
    }
  };
  walk("app");
  walk("components");
  assert.deepEqual(offenders, []);
});

// ...and in the built pages: a single footer landmark (not inside <main>), the dev line inside it, in both languages.
test("built pages: exactly one contentinfo, outside main, with the dev line inside it", () => {
  for (const l of ["en", "fr"]) {
    const root_ = dom(l);
    const footers = root_.querySelectorAll("footer");
    assert.equal(footers.length, 1, `${l}: one footer`);
    assert.equal(root_.querySelectorAll("main footer").length, 0, `${l}: the footer is outside main`);
    assert.ok(footers[0].querySelector('[data-testid="dev-environment-notice"]') || !raw(l).includes("dev-environment-notice"), `${l}: the dev line is inside the footer`);
  }
});

test("the bar uses the family's language switch (a globe and the current code), never a pill naming the other language", () => {
  const bar = readFileSync(new URL("../components/Bar.tsx", import.meta.url), "utf8");
  assert.match(bar, /NavBar\.Language/);
  assert.match(bar, /NavBar\.MobilePreferences/);
  assert.doesNotMatch(bar, /hrefLang/);
});
