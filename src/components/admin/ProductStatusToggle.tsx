"use client";

import { useState, useTransition } from "react";

import { setProductStatus, type ManualProductStatus } from "@/lib/actions/product-status";
import type { ProductStatus } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ManualProductStatus; label: string }[] = [
  { value: "available", label: "Disponibile" },
  { value: "sold", label: "Venduto" },
];

type ProductStatusToggleProps = {
  productId: string;
  status: ProductStatus;
};

export function ProductStatusToggle({ productId, status }: ProductStatusToggleProps) {
  const [currentStatus, setCurrentStatus] = useState<ProductStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSetStatus(next: ManualProductStatus) {
    if (pending || next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await setProductStatus(productId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrentStatus(next);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex w-fit divide-x border">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={pending}
            onClick={() => handleSetStatus(option.value)}
            aria-pressed={currentStatus === option.value}
            className={cn(
              "h-11 px-3 text-[0.65rem] font-medium tracking-[0.1em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              currentStatus === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="max-w-40 text-[0.65rem] text-destructive">{error}</p>}
    </div>
  );
}
