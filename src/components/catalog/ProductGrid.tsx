import type { CatalogEntry } from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";

type ProductGridProps = {
  entries: CatalogEntry[];
};

export function ProductGrid({ entries }: ProductGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <p className="text-xs tracking-[0.15em] text-muted-foreground uppercase">No pieces found</p>
        <p className="text-xs text-muted-foreground">Try adjusting or clearing your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-6 md:grid-cols-3 lg:grid-cols-4">
      {entries.map((entry) => (
        <ProductCard key={entry.product.id} entry={entry} />
      ))}
    </div>
  );
}
