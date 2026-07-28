import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/lib/catalog";
import { createCheckoutSession } from "@/lib/actions/checkout";
import { EmbeddedCheckoutMount } from "@/components/checkout/EmbeddedCheckoutMount";

export const metadata: Metadata = {
  title: "Checkout",
};

type CheckoutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Reserves the product (or redirects back to the product page if it's no
  // longer available / a shipping quote can't be obtained) and creates the
  // embedded Checkout Session — see src/lib/actions/checkout.ts.
  const { clientSecret } = await createCheckoutSession(product.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-1">
          <Link
            href={`/prodotto/${product.slug}`}
            className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground"
          >
            ← Torna al prodotto
          </Link>
          <h1 className="text-sm font-medium tracking-[0.15em] text-foreground uppercase">Checkout</h1>
          <p className="text-xs text-muted-foreground">
            {product.brand} — {product.name}
          </p>
        </div>

        <EmbeddedCheckoutMount clientSecret={clientSecret} />
      </div>
    </div>
  );
}
