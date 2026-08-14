import type { Metadata } from "next";
import { Suspense } from "react";

import { getCatalogEntries, getFilterOptions, parseCatalogFilters } from "@/lib/catalog";
import { FilterDrawerProvider } from "@/components/catalog/filter-drawer-context";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { ActiveFilterChips } from "@/components/catalog/ActiveFilterChips";
import { FilterDrawer } from "@/components/catalog/FilterDrawer";
import { ProductGrid } from "@/components/catalog/ProductGrid";

export const metadata: Metadata = {
  title: "Catalogo",
};

type CatalogoPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseCatalogFilters(resolvedSearchParams);

  // One entry per piece, not per product row: the sizes of a multi-size piece
  // are collapsed into a single card, so the result count below counts cards.
  const [entries, filterOptions] = await Promise.all([
    getCatalogEntries(filters),
    getFilterOptions(),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FilterDrawerProvider>
          <Suspense fallback={<CatalogToolbarFallback resultCount={entries.length} />}>
            <CatalogHeader resultCount={entries.length} />
            <ActiveFilterChips />
          </Suspense>
          <FilterDrawer
            brands={filterOptions.brands}
            categories={filterOptions.categories}
            sizes={filterOptions.sizes}
          />
        </FilterDrawerProvider>

        <ProductGrid entries={entries} />
      </div>
    </div>
  );
}

function CatalogToolbarFallback({ resultCount }: { resultCount: number }) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="space-y-1">
        <h1 className="text-lg font-medium tracking-[0.15em] text-foreground uppercase">Catalogo</h1>
        <p className="text-xs text-muted-foreground">{resultCount} pieces</p>
      </div>
    </div>
  );
}
