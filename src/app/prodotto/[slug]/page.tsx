import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/lib/catalog";
import { createCheckoutSession } from "@/lib/actions/checkout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { BuyNowButton } from "@/components/product/BuyNowButton";
import { ReservedAutoRefresh } from "@/components/product/ReservedAutoRefresh";
import { Button } from "@/components/ui/button";

const priceFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type ProdottoPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: ProdottoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  return {
    title: `${product.brand} — ${product.name}`,
  };
}

export default async function ProdottoPage({ params, searchParams }: ProdottoPageProps) {
  const { slug } = await params;
  const { checkout } = await searchParams;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {checkout === "unavailable" && (
          <p className="mb-6 border border-border px-3 py-2 text-xs text-muted-foreground uppercase tracking-[0.05em]">
            This piece was just reserved by someone else.
          </p>
        )}
        {checkout === "cancelled" && (
          <p className="mb-6 border border-border px-3 py-2 text-xs text-muted-foreground uppercase tracking-[0.05em]">
            Checkout was cancelled — your reservation is still held.
          </p>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} alt={product.name} />

          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.15em] text-muted-foreground uppercase">
                {product.brand}
              </p>
              <h1 className="text-2xl font-medium text-foreground">{product.name}</h1>
              <p className="text-lg text-foreground">{priceFormatter.format(product.price)}</p>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-y py-4 text-xs">
              <div className="space-y-1">
                <dt className="tracking-[0.1em] text-muted-foreground uppercase">Size</dt>
                <dd className="text-foreground">{product.size}</dd>
              </div>
              <div className="space-y-1">
                <dt className="tracking-[0.1em] text-muted-foreground uppercase">Condition</dt>
                <dd className="text-foreground">{product.condition}</dd>
              </div>
            </dl>

            {product.description && (
              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  Description
                </p>
                <p className="text-sm text-foreground">{product.description}</p>
              </div>
            )}

            {product.authenticityNotes && (
              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  Authenticity notes
                </p>
                <p className="text-sm text-foreground">{product.authenticityNotes}</p>
              </div>
            )}

            <div className="pt-2">
              {product.status === "available" && (
                <form action={createCheckoutSession.bind(null, product.id)}>
                  <BuyNowButton />
                </form>
              )}

              {product.status === "reserved" && (
                <>
                  <ReservedAutoRefresh />
                  <Button disabled className="w-full text-xs font-medium tracking-[0.1em] uppercase">
                    Riservato — verifica tra qualche minuto
                  </Button>
                </>
              )}

              {product.status === "sold" && (
                <Button disabled className="w-full text-xs font-medium tracking-[0.1em] uppercase">
                  Venduto
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
