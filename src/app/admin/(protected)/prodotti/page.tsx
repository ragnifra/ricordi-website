import type { Metadata } from "next";
import Link from "next/link";

import { getAdminProducts } from "@/lib/admin/products";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Prodotti — Admin",
};

export default async function AdminProdottiPage() {
  const products = await getAdminProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-sm font-medium tracking-[0.15em] text-foreground uppercase">
            Prodotti
          </h1>
          <p className="text-xs text-muted-foreground">
            {products.length} {products.length === 1 ? "pezzo" : "pezzi"} in archivio
          </p>
        </div>

        <Link
          href="/admin/nuovo-prodotto"
          className={cn(buttonVariants(), "h-11 text-xs font-medium tracking-[0.1em] uppercase")}
        >
          Nuovo prodotto
        </Link>
      </div>

      <ProductsTable products={products} />
    </div>
  );
}
