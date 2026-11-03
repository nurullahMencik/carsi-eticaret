import { en } from "./en";
import { tr, type Dictionary } from "./tr";

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "carsi_locale";
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { tr, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** "Merhaba {name}" + { name: "Ada" } -> "Merhaba Ada" */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Translates a validation message key (as produced by the Zod schemas). */
export function validationMessage(dict: Dictionary, key: string | undefined): string | undefined {
  if (!key) return undefined;
  return (dict.validation as Record<string, string>)[key] ?? key;
}

export function errorMessage(dict: Dictionary, code: string | undefined): string {
  return (dict.errors as Record<string, string>)[code ?? "UNKNOWN"] ?? dict.errors.UNKNOWN;
}

/** Picks the localised field of a bilingual record, e.g. localized(product, "name", "en") -> product.nameEn */
export function localized<T extends Record<string, unknown>, K extends string>(
  record: T & Record<`${K}Tr` | `${K}En`, unknown>,
  field: K,
  locale: Locale,
): string {
  const value = locale === "en" ? record[`${field}En`] : record[`${field}Tr`];
  const fallback = record[`${field}Tr`];
  return String((value as string | null | undefined) || (fallback as string | null | undefined) || "");
}

export function dateLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "tr-TR";
}

export function formatDate(date: Date | string, locale: Locale, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "Europe/Istanbul", ...opts }).format(new Date(date));
}

export function formatDateTime(date: Date | string, locale: Locale) {
  return formatDate(date, locale, { dateStyle: "medium", timeStyle: "short" });
}
