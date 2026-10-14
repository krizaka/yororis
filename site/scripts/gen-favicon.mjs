#!/usr/bin/env node
// public/favicon.svg = the published YororisLogo (@krizaka/ui), static. Re-run after a mark release: `node scripts/gen-favicon.mjs`.
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { YororisLogo } from "@krizaka/ui";

const svg = renderToStaticMarkup(createElement(YororisLogo, { size: 64, animated: false }))
  .replace(' aria-hidden="true"', "")
  .replace(/var\(--kz-border-(default|strong), color-mix\([^)]*\)\)/g, "#8a8a80");
writeFileSync(new URL("../public/favicon.svg", import.meta.url), svg);
console.log("public/favicon.svg written");
