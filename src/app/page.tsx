import Image from "next/image";
import Link from "next/link";

import { getCatalogEntries, type CatalogFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { HERO_IMAGES } from "@/lib/hero-images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NEW_ARRIVALS_COUNT = 4;
// Over-fetch past the display count so we still have enough pieces left
// after filtering out sold ones, without adding a status filter to the
// shared catalog query (which intentionally never excludes sold products).
// The limit caps rows, not cards, and a piece sold in several sizes is
// several rows collapsed into one card — hence the extra headroom.
const NEW_ARRIVALS_FETCH_LIMIT = 24;

const NEWEST_FILTERS: CatalogFilters = {
  brand: [],
  category: [],
  size: [],
  min: null,
  max: null,
  sort: "newest",
};

export default async function Home() {
  const recentEntries = await getCatalogEntries(NEWEST_FILTERS, {
    limit: NEW_ARRIVALS_FETCH_LIMIT,
  });
  const newArrivals = recentEntries
    .filter((entry) => entry.product.status !== "sold")
    .slice(0, NEW_ARRIVALS_COUNT);

  return (
    <main className="flex flex-1 flex-col">
      {/* -mt-16 pulls the hero up under the sticky header (h-16), which is
          transparent at the top of the home page; the hero fills the whole
          viewport, so its bottom edge — and everything below — stays exactly
          where it was. Symmetric py-24 keeps the content optically centred
          and clears the carousel controls at the bottom. */}
      <HeroCarousel
        images={HERO_IMAGES}
        className="-mt-16 flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-4 py-24 text-center animate-in fade-in duration-700"
      >
        {/* Scrim: a flat darkening plus a deeper pool behind the centred
            content. Sized for the brightest photos (large white walls and
            sweatshirts), so the chrome logo's dark strokes and the tagline
            hold on every one. The bottom fade hands off to the page below. */}
        <div aria-hidden className="absolute inset-0 z-[3] bg-background/55" />
        <div
          aria-hidden
          className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_70%)] opacity-70"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[3] h-1/4 bg-linear-to-b from-transparent to-background"
        />

        <Image
          src="/logo/logo-removebg-preview.png"
          alt="Ricordi Archive"
          width={500}
          height={500}
          priority
          className="relative z-[4] h-auto w-36 object-contain sm:w-48 lg:w-56"
        />

        <div className="relative z-[4] flex flex-col items-center gap-8">
          <p className="max-w-xs text-sm tracking-[0.05em] text-foreground sm:max-w-md sm:text-base">
            Archivio di pezzi irripetibili — luxury fashion e high-end streetwear
          </p>

          <Link
            href="/catalogo"
            className={cn(buttonVariants({ size: "lg" }), "px-10 tracking-[0.15em] uppercase")}
          >
            Esplora l&apos;archivio
          </Link>
        </div>
      </HeroCarousel>

      {newArrivals.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-lg font-medium tracking-[0.15em] text-foreground uppercase">
              Nuovi arrivi
            </h2>
            <Link
              href="/catalogo"
              className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Vedi tutto
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-6 md:grid-cols-4">
            {newArrivals.map((entry) => (
              <ProductCard key={entry.product.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
