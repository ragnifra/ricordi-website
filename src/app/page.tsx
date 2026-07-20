import Image from "next/image";
import Link from "next/link";

import { getProducts, type CatalogFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NEW_ARRIVALS_COUNT = 4;
// Over-fetch past the display count so we still have enough pieces left
// after filtering out sold ones, without adding a status filter to the
// shared catalog query (which intentionally never excludes sold products).
const NEW_ARRIVALS_FETCH_LIMIT = 12;

const NEWEST_FILTERS: CatalogFilters = {
  brand: [],
  category: [],
  size: [],
  min: null,
  max: null,
  sort: "newest",
};

export default async function Home() {
  const recentProducts = await getProducts(NEWEST_FILTERS, { limit: NEW_ARRIVALS_FETCH_LIMIT });
  const newArrivals = recentProducts
    .filter((product) => product.status !== "sold")
    .slice(0, NEW_ARRIVALS_COUNT);

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-10 bg-background px-4 py-16 text-center animate-in fade-in duration-700">
        <Image
          src="/logo/logo-removebg-preview.png"
          alt="Ricordi Archive"
          width={500}
          height={500}
          priority
          className="h-auto w-36 object-contain sm:w-48 lg:w-56"
        />

        <div className="flex flex-col items-center gap-8">
          <p className="max-w-xs text-sm tracking-[0.05em] text-muted-foreground sm:max-w-md sm:text-base">
            Archivio di pezzi irripetibili — luxury fashion e high-end streetwear
          </p>

          <Link
            href="/catalogo"
            className={cn(buttonVariants({ size: "lg" }), "px-10 tracking-[0.15em] uppercase")}
          >
            Esplora l&apos;archivio
          </Link>
        </div>
      </section>

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
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
