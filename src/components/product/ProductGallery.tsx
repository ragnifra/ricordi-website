"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/catalog";

type ProductGalleryProps = {
  images: ProductImage[];
  alt: string;
};

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted">
        <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">No image</p>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Image
          key={activeImage.id}
          src={activeImage.url}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative aspect-square overflow-hidden bg-muted outline outline-1 -outline-offset-1 outline-transparent transition-colors",
                index === activeIndex ? "outline-foreground" : "hover:outline-border"
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="20vw"
                className={cn(
                  "object-cover transition-opacity",
                  index === activeIndex ? "opacity-100" : "opacity-60"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
