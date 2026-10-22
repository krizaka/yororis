/**
 * The crisis cut-off: deterministic, run on what a person types BEFORE any model sees it. A sentence that names a wish to die or to hurt
 * oneself stops the moment at once; the answer is a fixed text (messages `console.moment.crisisFixed`), never generated. Pure: it takes a
 * sentence and answers a boolean. It keeps nothing, logs nothing, and the caller must not either. Biased to catch (a false alarm costs a
 * sentence of resources; a miss costs far more), but figures of speech (« mourir de rire », « this is killing me ») pass.
 */

/** Lower case, no accents, curly quotes straightened, anything that is not a letter or a digit is a space (« j e v e u x » is joined back). */
export function normalise(text: string): string {
  let t = text.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[’‘`´]/g, "'");
  // Letters spaced out one by one (« j e   v e u x ») are read as the words they spell (a wider gap separates the words).
  if (/(?:^|\s)(?:[a-z0-9] ){5,}[a-z0-9](?:\s|$)/.test(t)) t = t.replace(/(?<=\b[a-z0-9]) (?=[a-z0-9]\b)/g, "");
  return t.replace(/[^a-z0-9']+/g, " ").trim();
}

const FIGURE = "(?! de (?:rire|honte|faim|chaud|froid|fatigue|peur|soif|sommeil|envie|laughing|laughter|embarrassment|shame|hunger|boredom))";

const PATTERNS: RegExp[] = [
  // French
  /\bsuicid\w*/,
  /\b(?:envie|veux|voudrais|souhaite|vais|decide|pense|penser|songe|songer)\b.{0,12}\b(?:de |d' ?|a )?mourir\b(?! de )/,
  new RegExp(`\\bje (?:veux|voudrais|vais) mourir\\b${FIGURE}`),
  /\b(?:me|m') ?(?:tuer|pendre|noyer|jeter (?:du|de|sous|en bas)|enlever la vie|faire du mal|scarifier|scarifie\w*|mutiler|trancher|couper les veines)\b/,
  /\b(?:mettre fin a|abreger|en finir avec) (?:mes jours|ma vie|mon existence|la vie|tout ca|tout|moi)\b/,
  /\b(?:envie|veux|voudrais|vais|decide|pense|besoin|songe)\b.{0,10}\b(?:d'|de )?en finir\b(?! avec (?:ce|cette|ces|le|la|les|mon|ma|mes|un|une|l'))/,
  /\b(?:ne )?(?:veux|voulais) plus vivre\b/,
  /\b(?:plus|pas) (?:envie|la force|le gout|de raison|de courage) de vivre\b/,
  /\bpeux plus de vivre\b/,
  /\b(?:enlever|ote[rz]?) la vie\b/,
  /\b(?:mieux|plus heureux|plus heureuse) (?:sans moi|mort|morte)\b/,
  /\b(?:automutilation|auto mutilation|scarification|idees noires)\b/,
  // English
  /\bsuicid\w*/,
  /\bkill(?:ing)? myself\b/,
  /\b(?:want|wanna|going|plan|planning|thinking|think|decided|ready|need|wish)\b.{0,12}\b(?:to |2 )?(?:die|be dead|end it all|end my life|end things|kill myself|hurt myself|harm myself|disappear forever)\b(?! (?:laughing|of laughter|of embarrassment|of shame|inside a little))/,
  /\bdon'?t want to (?:be alive|live|exist|be here)\b/,
  /\b(?:do not|dont) want to (?:be alive|live|exist|be here)\b/,
  /\b(?:better off|would be better off) (?:dead|without me)\b/,
  /\b(?:no reason to live|nothing to live for|wish i (?:was|were) dead|wish i (?:would|could) (?:just )?(?:die|disappear))\b/,
  /\b(?:hurt|harm|cut|injure|cutting|hurting|harming|injuring) (?:my ?self)\b/,
  /\b(?:self harm|selfharm|self injur\w*)\b/,
  /\b(?:end|take|ending|taking) my (?:own )?life\b/,
  /\bend it all\b/,
  /\bnobody would miss me\b/,
];

export function detectCrisis(text: string): boolean {
  if (!text || text.length > 20_000) return false;
  const t = normalise(text);
  return PATTERNS.some((p) => p.test(t));
}
