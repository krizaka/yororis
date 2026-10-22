import "./globals.css";
import "@krizaka/ui/blocks.css";
import { YororisLogo } from "@krizaka/ui";
import { cn } from "@krizaka/ui/cn";
import { ThemeScript } from "@krizaka/ui/theme";
import { displayFace, monoFace, textFace } from "@/lib/fonts";
import { messages } from "@/lib/messages";

export const metadata = { title: "404 — Yororis" };

/* The 404 of both languages (two root layouts, so no layout to compose it from): the mark, one sentence each way, the way home. */
export default function GlobalNotFound() {
  return (
    <html lang="en" data-surface="product" className={cn(textFace.variable, displayFace.variable, monoFace.variable)} suppressHydrationWarning>
      <head>
        <ThemeScript defaultMode="system" />
      </head>
      <body className="brand-yororis">
        <main className="yo-404">
          <YororisLogo size={72} />
          <h1>404</h1>
          {(["en", "fr"] as const).map((l) => (
            <p key={l} lang={l}>
              {messages[l].notFound.body} <a href={l === "en" ? "/" : "/fr/"}>{messages[l].notFound.home}</a>
            </p>
          ))}
        </main>
      </body>
    </html>
  );
}
