// The size scale each category is sold in — the single source of truth for
// the admin size picker (src/components/admin/CategorySizeFields.tsx) and for
// the size run shown on the product page
// (src/components/product/SizeSelector.tsx).
//
// Sizes are plain strings stored verbatim in products.size, so a scale can be
// edited here without a migration: a product whose size is no longer part of
// its category's scale still renders (see buildSizeRun, which merges the two),
// it just can't be picked again for a new product.
//
// Client-importable on purpose — no server-only imports here.
import { CATEGORY_OPTIONS, type Category } from "@/lib/product-form";

export type SizeScale = {
  id: string;
  // Shown above the size picker in the admin form.
  label: string;
  sizes: readonly string[];
};

function numericRange(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}

export const SIZE_SCALES = {
  // Waist in inches, the way denim and trousers are actually tagged in
  // resale — not IT 44/46/48.
  waistInches: {
    id: "waistInches",
    label: "Vita (pollici)",
    sizes: numericRange(26, 40),
  },
  alpha: {
    id: "alpha",
    label: "Taglie alfabetiche",
    sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  },
  // Defined but currently unreachable: there is no footwear category in
  // CATEGORY_OPTIONS. Adding one is a single line in this file's map.
  shoesEu: {
    id: "shoesEu",
    label: "Numero (EU)",
    sizes: numericRange(35, 47),
  },
  // Fallback for categories with no natural scale — a bag or a belt is still
  // one physical piece, it just has a single size value so the product page
  // renders a one-entry run instead of a size grid.
  oneSize: {
    id: "oneSize",
    label: "Taglia unica",
    sizes: ["Taglia unica"],
  },
} as const satisfies Record<string, SizeScale>;

// Exhaustive over CATEGORY_OPTIONS by construction: adding a category to
// src/lib/product-form.ts without assigning it a scale is a type error.
export const CATEGORY_SIZE_SCALES: Record<Category, SizeScale> = {
  Pantaloni: SIZE_SCALES.waistInches,
  Giacche: SIZE_SCALES.alpha,
  Maglieria: SIZE_SCALES.alpha,
  Camicie: SIZE_SCALES.alpha,
  Borse: SIZE_SCALES.oneSize,
  Accessori: SIZE_SCALES.oneSize,
};

export function isCategory(value: string): value is Category {
  return (CATEGORY_OPTIONS as readonly string[]).includes(value);
}

export function getSizeScale(category: string): SizeScale | null {
  return isCategory(category) ? CATEGORY_SIZE_SCALES[category] : null;
}

export function getSizesForCategory(category: string): readonly string[] {
  return getSizeScale(category)?.sizes ?? [];
}

// Server-side gate for the sizes submitted by the admin form: a size is only
// accepted for a new product if its category's scale actually offers it.
export function isSizeInScale(category: string, size: string): boolean {
  return getSizesForCategory(category).includes(size);
}

export type SizeRunEntry<T> = {
  size: string;
  // The sibling product sold in this size, or null when the size run has a
  // gap there (never stocked in this size).
  member: T | null;
};

// The full size run to display for a piece: every size in the category's
// scale, in scale order, annotated with the group member sold in that size
// when there is one. Sizes held by a member but missing from the scale (a
// legacy value, or a scale edited after the fact) are appended at the end
// rather than silently dropped.
export function buildSizeRun<T extends { size: string }>(
  category: string,
  members: readonly T[]
): SizeRunEntry<T>[] {
  const bySize = new Map<string, T>();
  for (const member of members) {
    if (!bySize.has(member.size)) bySize.set(member.size, member);
  }

  const scaleSizes = getSizesForCategory(category);
  const run: SizeRunEntry<T>[] = scaleSizes.map((size) => ({
    size,
    member: bySize.get(size) ?? null,
  }));

  const offScale = [...bySize.keys()].filter((size) => !scaleSizes.includes(size));
  for (const size of offScale.sort()) {
    run.push({ size, member: bySize.get(size) ?? null });
  }

  return run;
}
