import localFont from "next/font/local";

/* The Krizaka typefaces — the files of @krizaka/fonts (SIL OFL 1.1), loaded by next/font/local, mapped to the token roles in app/globals.css. */
export const textFace = localFont({ src: "../node_modules/@krizaka/fonts/files/web/inter-latin-wght.woff2", weight: "400 700", variable: "--font-kz-text", display: "optional" });
export const displayFace = localFont({ src: "../node_modules/@krizaka/fonts/files/web/plus-jakarta-sans-latin-wght.woff2", weight: "500 800", variable: "--font-kz-display", display: "optional" });
export const monoFace = localFont({ src: "../node_modules/@krizaka/fonts/files/web/jetbrains-mono-latin-wght.woff2", weight: "400 700", variable: "--font-kz-mono", display: "swap", preload: false, adjustFontFallback: false, fallback: ["ui-monospace", "Menlo", "Consolas", "monospace"] });
