/**
 * The presences: who the person talks to. Each is stylised, says it is an AI mark at all times, and is never a real
 * person (docs/FRAMEWORK.md, the lexicon: « une présence IA »). The voices are Orazaka's catalogued voices, the same
 * names as `wellbeing/listening/listening.json` of orazaka-packs — a presence names a voice, it never carries a model.
 */
export type PresenceId = "lea" | "samuel" | "noor";
export type Language = "en" | "fr";

export interface Presence {
  id: PresenceId;
  name: string;
  /** The Orazaka voice per language (fr-FR for French: there is no Québécois voice yet). */
  voices: Record<Language, string>;
  /** The BCP 47 tag each language is sent with. */
  tags: Record<Language, string>;
}

export const PRESENCES: readonly Presence[] = [
  { id: "lea", name: "Léa", voices: { fr: "piper-fr-siwis-medium", en: "piper-en-low" }, tags: { fr: "fr-CA", en: "en" } },
  { id: "samuel", name: "Samuel", voices: { fr: "piper-fr-tom-medium", en: "piper-en-medium-ryan" }, tags: { fr: "fr-CA", en: "en" } },
  { id: "noor", name: "Noor", voices: { fr: "piper-fr-medium", en: "piper-en-low" }, tags: { fr: "fr-CA", en: "en" } },
];

export const presenceOf = (id: string): Presence | undefined => PRESENCES.find((p) => p.id === id);
