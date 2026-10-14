import { createI18n, type MessageKey as KeyOf } from "@krizaka/i18n";

import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/** Every word of the member space is a message (messages/en.json is the reference; fr.json is checked against it). */
export type Locale = "en" | "fr";
export type Messages = typeof en;
export type MessageKey = KeyOf<Messages>;
export const LOCALES: readonly Locale[] = ["en", "fr"];

export const i18n = createI18n<Messages, Locale>({ en, fr }, { defaultLocale: "en" });
export const { getDictionary, asLocale } = i18n;
