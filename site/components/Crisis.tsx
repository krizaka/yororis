import { InfoIcon } from "@krizaka/icons";
import type { Messages } from "@/lib/messages";

/** The crisis lines, plain and always reachable: a calm panel under « How it goes » and again near the footer, never in the hero. */
export function Crisis({ m }: { m: Messages["crisis"] }) {
  return (
    <aside className="yo-crisis" aria-label={m.aria}>
      <InfoIcon size={20} aria-hidden className="yo-crisis-icon" />
      <p className="yo-crisis-lead">
        <strong>{m.label}.</strong> {m.lead}
      </p>
      <p className="yo-crisis-lines">
        <span>
          {m.canada} <a href="tel:988">9-8-8</a>
        </span>
        <span>
          {m.quebec} <a href="tel:811">{m.quebecName}</a>
        </span>
      </p>
    </aside>
  );
}
