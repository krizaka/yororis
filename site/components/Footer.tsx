import type { Messages } from "@/lib/messages";
import { FAMILY, ORIGIN } from "@/lib/site";
import { version } from "@/lib/version";
import { YororisLogo } from "@krizaka/ui";

/* The shared footer of the family (NAV-SYS): the family in columns, "A Krizaka product", the version, Montréal.
   `@krizaka/ui`'s SiteFooter replaces this when it ships. */
export function Footer({ m, crisis }: { m: Messages["footer"]; crisis: Messages["crisis"] }) {
  return (
    <footer className="yo-footer">
      <div className="yo-footer-grid">
        <div className="yo-footer-about">
          <a href={ORIGIN} className="yo-footer-brand" aria-label="Yororis">
            <YororisLogo size={28} animated={false} />
            Yororis
          </a>
          <p>
            <a href={FAMILY.company.href}>{m.product}</a>
          </p>
          <p className="yo-footer-crisis">
            {crisis.label}: <a href="tel:988">9-8-8</a> · <a href="tel:811">{crisis.quebecName}</a>
          </p>
        </div>
        <nav aria-label={m.nav} className="yo-footer-cols">
          <div>
            <h2>{m.krizaka}</h2>
            <ul>
              <li><a href={FAMILY.company.href}>{m.links.site}</a></li>
              <li><a href={FAMILY.github} rel="noopener noreferrer">{m.links.org}</a></li>
            </ul>
          </div>
          <div>
            <h2>{m.products}</h2>
            <ul>
              {FAMILY.products.map((p) => (
                <li key={p.id}>
                  <a href={p.href} aria-current={"current" in p ? "page" : undefined}>{p.name}</a>
                  {"current" in p && <span className="yo-footer-status"> · {m.under}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{m.opensource}</h2>
            <ul>
              <li><a href={FAMILY.openSource[0].href}>{m.links.ui}</a></li>
              <li><a href={FAMILY.openSource[1].href}>{m.links.java}</a></li>
            </ul>
          </div>
        </nav>
      </div>
      <p className="yo-footer-base">
        <span>{m.city}</span>
        <span>
          {m.version} {version()}
        </span>
      </p>
    </footer>
  );
}
