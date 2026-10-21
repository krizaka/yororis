import localFont from "next/font/local";

/* The Krizaka typefaces (Cahier, krizaka-ui ADR-004: Young Serif, Atkinson Hyperlegible Next, Courier Prime) — the files of
   @krizaka/fonts (SIL OFL 1.1), loaded by next/font/local: preloaded, fingerprinted, metric-adjusted fallback (CLS 0). The
   latin file of each family covers English and French. app/globals.css puts them in the token roles (--kz-font-*). */
export const textFace = localFont({ src: "../node_modules/@krizaka/fonts/files/web/atkinson-hyperlegible-next-latin-wght.woff2", weight: "400 700", variable: "--font-kz-text", display: "optional" });
export const displayFace = localFont({ src: "../node_modules/@krizaka/fonts/files/web/young-serif-latin-400.woff2", weight: "400", adjustFontFallback: "Times New Roman", variable: "--font-kz-display", display: "optional" });
export const monoFace = localFont({
  src: [
    { path: "../node_modules/@krizaka/fonts/files/web/courier-prime-latin-400.woff2", weight: "400" },
    { path: "../node_modules/@krizaka/fonts/files/web/courier-prime-latin-700.woff2", weight: "700" },
  ],
  variable: "--font-kz-mono",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Courier New", "ui-monospace", "Menlo", "monospace"],
});
