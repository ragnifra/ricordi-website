"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";

// Loaded once at module scope, not per-render, per Stripe's own guidance —
// re-creating it on every mount would re-fetch Stripe.js unnecessarily.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SHIPPING_UNAVAILABLE_MESSAGE = "Spedizione non disponibile per questo paese al momento.";

type UpdateShippingResponse = { ok: boolean; message?: string };

type EmbeddedCheckoutMountProps = {
  clientSecret: string;
};

export function EmbeddedCheckoutMount({ clientSecret }: EmbeddedCheckoutMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let checkout: StripeEmbeddedCheckout | null = null;
    let cancelled = false;

    async function mount() {
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;

      const instance = await stripe.createEmbeddedCheckoutPage({
        clientSecret,
        // Required because the session is created with
        // permissions.update_shipping_details = "server_only" — only our
        // server (via /api/checkout/update-shipping) is allowed to change
        // shipping_options, since the rate comes from Sendcloud, not Stripe.
        onShippingDetailsChange: async (event) => {
          try {
            const response = await fetch("/api/checkout/update-shipping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                checkoutSessionId: event.checkoutSessionId,
                shippingDetails: event.shippingDetails,
              }),
            });

            const data = (await response.json()) as UpdateShippingResponse;

            if (data.ok) return { type: "accept" as const };
            return { type: "reject" as const, errorMessage: data.message ?? SHIPPING_UNAVAILABLE_MESSAGE };
          } catch {
            return { type: "reject" as const, errorMessage: SHIPPING_UNAVAILABLE_MESSAGE };
          }
        },
      });

      if (cancelled) {
        instance.destroy();
        return;
      }

      checkout = instance;
      if (containerRef.current) instance.mount(containerRef.current);
      setReady(true);
    }

    mount().catch(() => setLoadError("Impossibile caricare il pagamento. Riprova più tardi."));

    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [clientSecret]);

  if (loadError) {
    return (
      <p
        role="alert"
        className="border border-destructive px-3 py-2 text-xs text-destructive uppercase tracking-[0.05em]"
      >
        {loadError}
      </p>
    );
  }

  return (
    <>
      {!ready && (
        <p className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-[0.05em]">
          Caricamento pagamento…
        </p>
      )}
      <div ref={containerRef} />
    </>
  );
}
