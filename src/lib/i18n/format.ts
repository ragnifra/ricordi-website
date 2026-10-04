// Number formatting per language — the same locales as the confirmation
// email (en-IE: euro sign before the amount, dot decimals). Client-safe.
import type { Language } from "@/lib/i18n/config";

const NUMBER_LOCALE = { it: "it-IT", en: "en-IE" } as const satisfies Record<Language, string>;

const priceFormatters = {
  it: new Intl.NumberFormat(NUMBER_LOCALE.it, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat(NUMBER_LOCALE.en, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
} satisfies Record<Language, Intl.NumberFormat>;

const measurementFormatters = {
  it: new Intl.NumberFormat(NUMBER_LOCALE.it, { maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat(NUMBER_LOCALE.en, { maximumFractionDigits: 1 }),
} satisfies Record<Language, Intl.NumberFormat>;

export function formatPrice(lang: Language, value: number): string {
  return priceFormatters[lang].format(value);
}

/** A garment measurement, in centimetres. */
export function formatMeasurement(lang: Language, value: number): string {
  return `${measurementFormatters[lang].format(value)} cm`;
}
