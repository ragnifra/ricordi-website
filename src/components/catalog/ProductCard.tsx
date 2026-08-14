"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/catalog";

const priceFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type ProductCardProps = {
  entry: CatalogEntry;
};

export function ProductCard({ entry }: ProductCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // A piece sold in several sizes is one card: the representative row decides
  // what's shown and where the card links, and the size selector on its
  // product page takes over from there.
  const product = entry.product;
  const images = product.images;
  const hasMultipleImages = images.length > 1;
  const isSold = product.status === "sold";
  const isReserved = product.status === "reserved";

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  return (
    <div className="group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {hasMultipleImages && (
          <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">
            {images.map((image, index) => (
              <span
                key={image.id}
                className={cn(
                  "h-[2px] flex-1 bg-foreground/30 transition-colors",
                  index === activeIndex && "bg-foreground"
                )}
              />
            ))}
          </div>
        )}

        <div className={cn("absolute inset-0", isSold && "grayscale brightness-50")}>
          {images.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.1em] text-muted-foreground uppercase">
              No image
            </div>
          ) : (
            images.map((image, index) => (
              <Image
                key={image.id}
                src={image.url}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className={cn(
                  "object-cover transition-opacity duration-200",
                  index === activeIndex ? "opacity-100" : "opacity-0"
                )}
                priority={index === 0}
              />
            ))
          )}
        </div>

        {isReserved && (
          <span className="absolute top-2 left-2 z-10 border border-foreground bg-background px-2 py-1 text-[0.65rem] font-medium tracking-[0.1em] text-foreground uppercase">
            Riservato
          </span>
        )}

        {isSold && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="-rotate-12 border border-foreground bg-background px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-foreground uppercase">
              Sold
            </span>
          </div>
        )}

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous image"
              className="absolute top-1/2 left-1 z-20 flex size-7 -translate-y-1/2 items-center justify-center bg-background/60 text-foreground opacity-100 transition-opacity after:absolute after:-inset-2.5 md:opacity-0 md:group-hover:opacity-100"
            >
              <CaretLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Next image"
              className="absolute top-1/2 right-1 z-20 flex size-7 -translate-y-1/2 items-center justify-center bg-background/60 text-foreground opacity-100 transition-opacity after:absolute after:-inset-2.5 md:opacity-0 md:group-hover:opacity-100"
            >
              <CaretRightIcon className="size-4" />
            </button>
          </>
        )}
      </div>

      <div className="space-y-1 pt-3">
        <p className="text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">{product.brand}</p>
        <p className="text-xs text-foreground">{product.name}</p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs text-foreground">{priceFormatter.format(product.price)}</p>
          {/* Only worth saying when there's actually a choice to make — one
              remaining size reads as a normal single piece. Sits on the price
              line so a grouped card is exactly as tall as every other one. */}
          {entry.availableSizeCount > 1 && (
            <p className="text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
              {entry.availableSizeCount} taglie
            </p>
          )}
        </div>
      </div>

      <Link
        href={`/prodotto/${product.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`${product.brand} ${product.name}`}
      />
    </div>
  );
}
