// Lookups over the active language's SiteCopy. Pure and client-safe: it takes
// the copy as an argument and only imports types, so it never pulls the
// dictionary itself into a client bundle.
import type { SiteCopy } from "@/lib/i18n/dictionary";

/** Replaces {name} placeholders: fill("Foto {n} di {total}", { n: 1, total: 4 }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

// Values read from the database may predate the current taxonomy, so every
// lookup falls back to the stored value rather than rendering nothing.
function lookup(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

export function categoryLabel(copy: SiteCopy, category: string): string {
  return lookup(copy.taxonomy.categories, category);
}

export function conditionLabel(copy: SiteCopy, condition: string): string {
  return lookup(copy.taxonomy.conditions, condition);
}

export function sizeLabel(copy: SiteCopy, size: string): string {
  return lookup(copy.taxonomy.sizeValues, size);
}
