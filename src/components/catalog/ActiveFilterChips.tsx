"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "@phosphor-icons/react";

import { buildQueryString, parseListParam } from "@/components/catalog/url-filters";

type Chip = {
  key: string;
  label: string;
  onRemove: () => void;
};

export function ActiveFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(query: string) {
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function removeListValue(key: "brand" | "category" | "size", value: string) {
    const remaining = parseListParam(searchParams, key).filter((entry) => entry !== value);
    navigate(buildQueryString(searchParams, { [key]: remaining.join(",") || null }));
  }

  function removeParam(key: "min" | "max") {
    navigate(buildQueryString(searchParams, { [key]: null }));
  }

  const chips: Chip[] = [
    ...parseListParam(searchParams, "brand").map((value) => ({
      key: `brand-${value}`,
      label: value,
      onRemove: () => removeListValue("brand", value),
    })),
    ...parseListParam(searchParams, "category").map((value) => ({
      key: `category-${value}`,
      label: value,
      onRemove: () => removeListValue("category", value),
    })),
    ...parseListParam(searchParams, "size").map((value) => ({
      key: `size-${value}`,
      label: `Size ${value}`,
      onRemove: () => removeListValue("size", value),
    })),
  ];

  const min = searchParams.get("min");
  const max = searchParams.get("max");
  if (min) chips.push({ key: "min", label: `Min €${min}`, onRemove: () => removeParam("min") });
  if (max) chips.push({ key: "max", label: `Max €${max}`, onRemove: () => removeParam("max") });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="flex items-center gap-1.5 border border-input px-2.5 py-1 text-xs tracking-[0.05em] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground"
        >
          {chip.label}
          <XIcon className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => navigate(buildQueryString(searchParams, { brand: null, category: null, size: null, min: null, max: null }))}
        className="px-2.5 py-1 text-xs tracking-[0.05em] text-muted-foreground uppercase underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
