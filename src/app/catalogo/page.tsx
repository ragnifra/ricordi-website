import type { Metadata } from "next";
import { Suspense } from "react";

import { getCatalogEntries, getFilterOptions, parseCatalogFilters } from "@/lib/catalog";
import { FilterDrawerProvider } from "@/components/catalog/filter-drawer-context";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { ActiveFilterChips } from "@/components/catalog/ActiveFilterChips";
import { FilterDrawer } from "@/components/catalog/FilterDrawer";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getCopy } from "@/lib/i18n/server";
import type { SiteCopy } from "@/lib/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.pages.catalog };
}

type CatalogoPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const resolvedSearchParams = await searchParams;
  const copy = await getCopy();
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
          <Suspense fallback={<CatalogToolbarFallback resultCount={entries.length} copy={copy} />}>
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

function CatalogToolbarFallback({ resultCount, copy }: { resultCount: number; copy: SiteCopy }) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="space-y-1">
        <h1 className="text-lg font-medium tracking-[0.15em] text-foreground uppercase">
          {copy.pages.catalog}
        </h1>
        <p className="text-xs text-muted-foreground">
          {resultCount} {resultCount === 1 ? copy.catalog.pieceOne : copy.catalog.pieceMany}
        </p>
      </div>
    </div>
  );
}
