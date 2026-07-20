import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { ProductStatusToggle } from "@/components/admin/ProductStatusToggle";
import type { AdminProduct } from "@/lib/admin/products";
import type { ProductStatus } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const priceFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  return iso ? dateFormatter.format(new Date(iso)) : "—";
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  available: "Disponibile",
  reserved: "Riservato",
  sold: "Venduto",
};

const STATUS_BADGE_VARIANT: Record<ProductStatus, "outline" | "secondary" | "destructive"> = {
  available: "outline",
  reserved: "secondary",
  sold: "destructive",
};

const editButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "h-11 px-3 text-[0.65rem] font-medium tracking-[0.1em] uppercase"
);

type ProductsTableProps = {
  products: AdminProduct[];
};

export function ProductsTable({ products }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 border border-dashed py-24 text-center">
        <p className="text-xs tracking-[0.15em] text-muted-foreground uppercase">
          Nessun prodotto in archivio
        </p>
        <Link
          href="/admin/nuovo-prodotto"
          className={cn(buttonVariants(), "text-xs font-medium tracking-[0.1em] uppercase")}
        >
          Aggiungi il primo prodotto
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Table — comfortable from md upward. */}
      <div className="hidden overflow-x-auto border md:block">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
              <th className="p-3 font-medium">Immagine</th>
              <th className="p-3 font-medium">Prodotto</th>
              <th className="p-3 font-medium">Prezzo</th>
              <th className="p-3 font-medium">Costo</th>
              <th className="p-3 font-medium">Stato</th>
              <th className="p-3 font-medium">Creato</th>
              <th className="p-3 font-medium">Venduto</th>
              <th className="p-3 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-b-0">
                <td className="p-3">
                  <Thumbnail product={product} />
                </td>
                <td className="p-3">
                  <p className="text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
                    {product.brand}
                  </p>
                  <p className="text-foreground">{product.name}</p>
                </td>
                <td className="p-3 text-foreground">{priceFormatter.format(product.price)}</td>
                <td className="p-3 text-foreground">
                  {product.cost !== null ? priceFormatter.format(product.cost) : "—"}
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_BADGE_VARIANT[product.status]}>
                    {STATUS_LABEL[product.status]}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(product.createdAt)}</td>
                <td className="p-3 text-muted-foreground">{formatDate(product.soldAt)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProductStatusToggle productId={product.id} status={product.status} />
                    <Link href={`/admin/prodotti/${product.id}/modifica`} className={editButtonClass}>
                      Modifica
                    </Link>
                    <DeleteProductButton
                      productId={product.id}
                      productLabel={`${product.brand} ${product.name}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked cards — below md, comfortable down to 375-390px. */}
      <div className="flex flex-col gap-3 md:hidden">
        {products.map((product) => (
          <div key={product.id} className="border p-3">
            <div className="flex gap-3">
              <Thumbnail product={product} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
                  {product.brand}
                </p>
                <p className="text-foreground">{product.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
                  <span>{priceFormatter.format(product.price)}</span>
                  <span className="text-muted-foreground">
                    Costo: {product.cost !== null ? priceFormatter.format(product.cost) : "—"}
                  </span>
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[product.status]}>
                  {STATUS_LABEL[product.status]}
                </Badge>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[0.7rem]">
              <div>
                <dt className="tracking-[0.1em] text-muted-foreground uppercase">Creato</dt>
                <dd className="text-foreground">{formatDate(product.createdAt)}</dd>
              </div>
              <div>
                <dt className="tracking-[0.1em] text-muted-foreground uppercase">Venduto</dt>
                <dd className="text-foreground">{formatDate(product.soldAt)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              <ProductStatusToggle productId={product.id} status={product.status} />
              <Link href={`/admin/prodotti/${product.id}/modifica`} className={editButtonClass}>
                Modifica
              </Link>
              <DeleteProductButton
                productId={product.id}
                productLabel={`${product.brand} ${product.name}`}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Thumbnail({ product }: { product: AdminProduct }) {
  const image = product.images[0];

  return (
    <div className="relative size-14 shrink-0 overflow-hidden bg-muted">
      {image ? (
        <Image src={image.url} alt={product.name} fill sizes="56px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[0.6rem] text-muted-foreground uppercase">
          n/a
        </div>
      )}
    </div>
  );
}
