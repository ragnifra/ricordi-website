"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildQueryString, parseListParam, SORT_OPTIONS, type SortOption } from "@/components/catalog/url-filters";
import { useFilterDrawer } from "@/components/catalog/filter-drawer-context";

type CatalogHeaderProps = {
  resultCount: number;
};

export function CatalogHeader({ resultCount }: CatalogHeaderProps) {
  const { setOpen } = useFilterDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = (searchParams.get("sort") as SortOption | null) ?? "newest";
  const activeFilterCount =
    parseListParam(searchParams, "brand").length +
    parseListParam(searchParams, "category").length +
    parseListParam(searchParams, "size").length +
    (searchParams.get("min") ? 1 : 0) +
    (searchParams.get("max") ? 1 : 0);

  function handleSortChange(value: SortOption | null) {
    const query = buildQueryString(searchParams, { sort: value === "newest" ? null : value });
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-lg font-medium tracking-[0.15em] text-foreground uppercase">Catalogo</h1>
        <p className="text-xs text-muted-foreground">
          {resultCount} {resultCount === 1 ? "piece" : "pieces"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="text-xs font-medium tracking-[0.1em] uppercase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs tracking-[0.05em] uppercase"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="relative text-xs font-medium tracking-[0.1em] uppercase"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontalIcon data-icon="inline-start" />
          Refine
          {activeFilterCount > 0 && <Badge className="ml-1.5">{activeFilterCount}</Badge>}
        </Button>
      </div>
    </div>
  );
}
