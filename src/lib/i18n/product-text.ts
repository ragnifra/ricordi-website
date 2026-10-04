// The admin's free-text product fields, resolved for the page language.
//
// Today every field exists in Italian only, so this always returns the
// Italian text tagged lang "it" — the product page marks the block with that
// lang and, when it differs from the page language, shows a one-line note.
// When English fields are added (a column, PRODUCT_SELECT, and the admin
// form), this is the only place that has to learn about them:
//   if (lang === "en" && product.descriptionEn) return { text: product.descriptionEn, lang: "en" };
import type { Language } from "@/lib/i18n/config";

export type ProductTextField = "description" | "composition" | "authenticityNotes";

export type LocalizedText = { text: string; lang: Language };

export function productText(
  product: Record<ProductTextField, string | null>,
  field: ProductTextField,
  // Unused until English fields exist; kept so callers don't change then.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lang: Language
): LocalizedText | null {
  const text = product[field];
  return text ? { text, lang: "it" } : null;
}
