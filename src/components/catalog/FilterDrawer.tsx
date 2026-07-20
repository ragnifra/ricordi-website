"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildQueryString, parseListParam } from "@/components/catalog/url-filters";
import { useFilterDrawer } from "@/components/catalog/filter-drawer-context";

type FilterDrawerProps = {
  brands: string[];
  categories: string[];
  sizes: string[];
};

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function FilterDrawer({ brands, categories, sizes }: FilterDrawerProps) {
  const { open, setOpen } = useFilterDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draftBrand, setDraftBrand] = useState<string[]>([]);
  const [draftCategory, setDraftCategory] = useState<string[]>([]);
  const [draftSize, setDraftSize] = useState<string[]>([]);
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");

  // Re-seed the draft fields from the URL each time the drawer transitions
  // from closed to open, so it always reflects the current filters.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraftBrand(parseListParam(searchParams, "brand"));
      setDraftCategory(parseListParam(searchParams, "category"));
      setDraftSize(parseListParam(searchParams, "size"));
      setDraftMin(searchParams.get("min") ?? "");
      setDraftMax(searchParams.get("max") ?? "");
    }
  }

  function handleClearAll() {
    setDraftBrand([]);
    setDraftCategory([]);
    setDraftSize([]);
    setDraftMin("");
    setDraftMax("");
  }

  function handleApply() {
    const query = buildQueryString(searchParams, {
      brand: draftBrand.join(","),
      category: draftCategory.join(","),
      size: draftSize.join(","),
      min: draftMin,
      max: draftMax,
    });
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="max-sm:w-full! gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="text-xs font-medium tracking-[0.15em] uppercase">
            Refine
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <Accordion multiple defaultValue={["brand"]}>
            <FilterSection
              value="brand"
              label="Brand"
              options={brands}
              selected={draftBrand}
              onToggle={(option) => setDraftBrand((prev) => toggleValue(prev, option))}
            />
            <FilterSection
              value="category"
              label="Category"
              options={categories}
              selected={draftCategory}
              onToggle={(option) => setDraftCategory((prev) => toggleValue(prev, option))}
            />
            <FilterSection
              value="size"
              label="Size"
              options={sizes}
              selected={draftSize}
              onToggle={(option) => setDraftSize((prev) => toggleValue(prev, option))}
            />
          </Accordion>

          <div className="space-y-3 border-t py-4">
            <p className="text-xs font-medium tracking-[0.15em] uppercase">Price</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="price-min" className="text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
                  Min
                </Label>
                <Input
                  id="price-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={draftMin}
                  onChange={(event) => setDraftMin(event.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="price-max" className="text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
                  Max
                </Label>
                <Input
                  id="price-max"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Any"
                  value={draftMax}
                  onChange={(event) => setDraftMax(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t p-4">
          <Button variant="outline" className="flex-1 text-xs font-medium tracking-[0.1em] uppercase" onClick={handleClearAll}>
            Clear all
          </Button>
          <Button className="flex-1 text-xs font-medium tracking-[0.1em] uppercase" onClick={handleApply}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type FilterSectionProps = {
  value: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
};

function FilterSection({ value, label, options, selected, onToggle }: FilterSectionProps) {
  if (options.length === 0) return null;

  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-xs font-medium tracking-[0.15em] uppercase hover:no-underline">
        <span className="flex items-center gap-1.5">
          {label}
          {selected.length > 0 && (
            <span className="text-muted-foreground normal-case">({selected.length})</span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <div key={option} className="flex items-center gap-2.5">
              <Checkbox
                id={`${value}-${option}`}
                checked={selected.includes(option)}
                onCheckedChange={() => onToggle(option)}
              />
              <Label htmlFor={`${value}-${option}`} className="cursor-pointer text-xs">
                {option}
              </Label>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
