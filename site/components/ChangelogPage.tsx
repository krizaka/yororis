
import { RELEASES, PULLS_URL } from "@/lib/changelog";
import { getMessages, homePath, type Locale } from "@/lib/messages";
import { uiVersion } from "@/lib/platform";
import { version } from "@/lib/version";

import { ChangelogBody } from "./ChangelogBody";

/** `/changelog` and `/fr/changelog` (changelog template): the weeks of merged work, read at build. */
export function ChangelogRoute({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  return (
    <main id="main" className="pt-20">
      <ChangelogBody
        c={m.changelogPage}
        releases={RELEASES}
        version={version()}
        ui={uiVersion()}
        back={{ href: homePath(locale), label: "Yororis" }}
        feedHref="/changelog/feed.xml"
        pullsUrl={PULLS_URL}
      />
    </main>
  );
}

