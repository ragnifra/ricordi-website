// The size run a piece is sold in — the single source of truth for the admin
// size picker (src/components/admin/ProductTaxonomyFields.tsx) and for the run
// shown on the product page (src/components/product/SizeSelector.tsx).
//
// The scale belongs to the (gender, category) PAIR, not to the category
// alone: men's and women's jeans are tagged on different runs. The pair itself
// lives in src/lib/taxonomy.ts; this module is only the size-run logic built
// on top of it.
//
// Sizes are plain strings stored verbatim in products.size, so a scale can be
// edited in taxonomy.ts without a migration: a product whose size is no longer
// part of its scale still renders (see buildSizeRun, which merges the two), it
// just can't be picked again for a new product.
//
// Client-importable on purpose — no server-only imports here.
import { getSizeScale } from "@/lib/taxonomy";

export { getSizeScale } from "@/lib/taxonomy";
export type { SizeScale } from "@/lib/taxonomy";

export function getSizesFor(gender: string, category: string): readonly string[] {
  return getSizeScale(gender, category)?.sizes ?? [];
}

// Server-side gate for the sizes submitted by the admin form: a size is only
// accepted for a new product if its gender+category scale actually offers it.
export function isSizeInScale(gender: string, category: string, size: string): boolean {
  return getSizesFor(gender, category).includes(size);
}

export type SizeRunEntry<T> = {
  size: string;
  // The sibling product sold in this size, or null when the size run has a
  // gap there (never stocked in this size).
  member: T | null;
};

// The full size run to display for a piece: every size in the scale, in scale
// order, annotated with the group member sold in that size when there is one.
// Sizes held by a member but missing from the scale (a legacy value, or a
// scale edited after the fact) are appended at the end rather than silently
// dropped.
export function buildSizeRun<T extends { size: string }>(
  gender: string,
  category: string,
  members: readonly T[]
): SizeRunEntry<T>[] {
  const bySize = new Map<string, T>();
  for (const member of members) {
    if (!bySize.has(member.size)) bySize.set(member.size, member);
  }

  const scaleSizes = getSizesFor(gender, category);
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
