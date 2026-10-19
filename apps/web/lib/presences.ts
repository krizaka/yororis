import { portrait } from "./media";

/**
 * The presences: who the person talks to. Each wears the AI mark at all times and is never a real person (docs/FRAMEWORK.md,
 * the lexicon: « une présence IA »). The voices are Orazaka's catalogued voices, the same names as
 * `wellbeing/listening/listening.json` of orazaka-packs — a presence names a voice, it never carries a model.
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
  /** The face: a generated, fictitious person of the shared library — never a real one. Always shown with the AI mark. */
  face: string;
}

export const PRESENCES: readonly Presence[] = [
  { id: "lea", name: "Léa", voices: { fr: "piper-fr-siwis-medium", en: "piper-en-low" }, tags: { fr: "fr-CA", en: "en" }, face: portrait("camille") },
  { id: "samuel", name: "Samuel", voices: { fr: "piper-fr-tom-medium", en: "piper-en-medium-ryan" }, tags: { fr: "fr-CA", en: "en" }, face: portrait("tomas") },
  { id: "noor", name: "Noor", voices: { fr: "piper-fr-medium", en: "piper-en-medium-lessac" }, tags: { fr: "fr-CA", en: "en" }, face: portrait("noor") },
];

export const presenceOf = (id: string): Presence | undefined => PRESENCES.find((p) => p.id === id);
