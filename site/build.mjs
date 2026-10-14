#!/usr/bin/env node
// The static page of Yororis (construction mode, one exception — see AGENTS.md): plain HTML + CSS, no script, no form.
// The mark is rendered from the published @krizaka/ui (YororisLogo), the colours are @krizaka/tokens (+ brand yororis),
// dark by default and light through prefers-color-scheme. Output: site/dist (en at /, fr at /fr/).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { YororisLogo } from "@krizaka/ui";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
export const CONTACT = "https://www.krizaka.com/contact?topic=yororis";
export const KRIZAKA = "https://www.krizaka.com";
export const ORIGIN = "https://dev.yororis.com";

export const messages = JSON.parse(readFileSync(join(here, "messages.json"), "utf8"));

export function version() {
  const v = JSON.parse(readFileSync(join(here, "package.json"), "utf8")).version;
  let sha = process.env.APP_VERSION_SHA ?? "";
  if (!sha) try { sha = execSync("git rev-parse --short HEAD", { cwd: here, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim(); } catch { /* no git on the builder */ }
  return process.env.APP_VERSION ?? (sha ? `${v}+${sha}` : v);
}

// tokens.css and the brand put the light theme on `html.light`; the site follows the system instead.
const lightByMedia = (css) =>
  css.replace(/\.theme-light\s*\{[^}]*\}/g, "").replace(/html\.light\s*\{([^}]*)\}/g, "@media (prefers-color-scheme: light){:root{$1}}");
const pkg = (p) => readFileSync(join(here, "node_modules", p), "utf8");

const css = `${lightByMedia(pkg("@krizaka/tokens/dist/tokens.css"))}
${lightByMedia(pkg("@krizaka/tokens/dist/brands/yororis.css"))}
@media (prefers-color-scheme: light){:root{color-scheme:light}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:linear-gradient(160deg,var(--kz-brand-gradient-from),var(--kz-brand-gradient-via) 55%,var(--kz-surface-0));color:var(--kz-text-primary);font:1rem/1.6 var(--kz-font-sans,system-ui,-apple-system,"Segoe UI",sans-serif)}
main,header,footer{width:100%;max-width:44rem;margin:0 auto;padding:0 1rem}
@media (min-width:640px){main,header,footer{padding:0 2rem}}
header{display:flex;justify-content:flex-end;padding-top:1.25rem}
a{color:var(--kz-accent-text)}
a:focus-visible{outline:2px solid var(--kz-ring);outline-offset:3px;border-radius:4px}
main{flex:1;padding-top:3rem;padding-bottom:3rem}
.mark{display:block;margin-bottom:1.5rem}
.eyebrow{display:inline-block;margin:0 0 .75rem;padding:.2rem .75rem;border:1px solid var(--kz-accent);border-radius:999px;color:var(--kz-accent-text);font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase}
h1{margin:0;font-size:clamp(2.5rem,8vw,4rem);line-height:1.05}
.lead{margin:.75rem 0 0;font-size:1.25rem;color:var(--kz-text-secondary)}
.status{margin:2rem 0 0;font-size:1.0625rem}
h2{margin:2.5rem 0 .75rem;font-size:1.25rem}
ul{margin:0;padding:0;list-style:none;display:grid;gap:.75rem}
li{padding:.875rem 1rem;border:1px solid var(--kz-border-default);border-left:3px solid var(--kz-accent);border-radius:11px;background:var(--kz-surface-1)}
.rule{margin:1rem 0 0;color:var(--kz-text-secondary)}
.cta{display:inline-block;margin-top:2.5rem;padding:.8rem 1.5rem;border-radius:10px;background:var(--kz-accent);color:var(--kz-on-accent);font-weight:600;text-decoration:none}
.cta:hover{background:var(--kz-accent-hover)}
footer{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;justify-content:space-between;padding-top:1.5rem;padding-bottom:1.5rem;border-top:1px solid var(--kz-border-default);color:var(--kz-text-secondary);font-size:.875rem}
`;

export function page(locale) {
  const m = messages[locale];
  const other = locale === "en" ? "fr" : "en";
  const path = (l) => (l === "en" ? "/" : "/fr/");
  const mark = renderToStaticMarkup(createElement(YororisLogo, { size: 72 })).replace("<svg ", `<svg class="mark" role="img" aria-label="Yororis" `).replace(' aria-hidden="true"', "");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="${m.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}">
<link rel="canonical" href="${ORIGIN}${path(locale)}">
<link rel="alternate" hreflang="en" href="${ORIGIN}/">
<link rel="alternate" hreflang="fr" href="${ORIGIN}/fr/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${css}</style>
</head>
<body>
<header><a href="${path(other)}" hreflang="${other}" lang="${other}" aria-label="${esc(m.otherLabel)}">${esc(m.other)}</a></header>
<main>
${mark}
<p class="eyebrow">${esc(m.eyebrow)}</p>
<h1>${esc(m.h1)}</h1>
<p class="lead">${esc(m.lead)}</p>
<p class="status">${esc(m.reviewed.construction)}</p>
<h2>${esc(m.isNotTitle)}</h2>
<ul>
${m.reviewed.isNot.map((t) => `<li>${esc(t)}</li>`).join("\n")}
</ul>
<p class="rule">${esc(m.reviewed.isNotRule)}</p>
<a class="cta" href="${CONTACT}">${esc(m.cta)}</a>
</main>
<footer>
<a href="${KRIZAKA}">${esc(m.product)}</a>
<span>${esc(m.version)} ${esc(version())}</span>
</footer>
</body>
</html>
`;
}

export function favicon() {
  return renderToStaticMarkup(createElement(YororisLogo, { size: 64 })).replace(' aria-hidden="true"', "").replace(/var\(--kz-border-(default|strong), color-mix\([^)]*\)\)/g, "#8a8a80");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, "fr"), { recursive: true });
  writeFileSync(join(dist, "index.html"), page("en"));
  writeFileSync(join(dist, "fr/index.html"), page("fr"));
  writeFileSync(join(dist, "404.html"), page("en"));
  writeFileSync(join(dist, "favicon.svg"), favicon());
  writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n`);
  console.log(`site/dist built (version ${version()})`);
}
