import en from "../messages/en.json";
import fr from "../messages/fr.json";

/** `en.json` is the reference: its shape is the type, so a missing French key fails type-checking. */
export type Messages = typeof en;
export type Locale = "en" | "fr";
export const messages: Record<Locale, Messages> = { en, fr };
export const getMessages = (locale: Locale): Messages => messages[locale];
export const homePath = (locale: Locale) => (locale === "en" ? "/" : "/fr/");
