"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, CheckoutFormAddress, StripeCheckoutForm } from "@stripe/stripe-js";

// Loaded once at module scope, not per-render, per Stripe's own guidance —
// re-creating it on every mount would re-fetch Stripe.js unnecessarily.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SHIPPING_UNAVAILABLE_MESSAGE = "Spedizione non disponibile per questo paese al momento.";
const LOAD_ERROR_MESSAGE = "Impossibile caricare il pagamento. Riprova più tardi.";

// The form renders inside Stripe's iframe, so it can't read our CSS tokens —
// these mirror the .dark values in src/app/globals.css (background,
// foreground, muted-foreground, primary, destructive) as hex, since the
// Appearance API doesn't take oklch. borderRadius 0 = the site's sharp edges.
const APPEARANCE: Omit<Appearance, "rules"> = {
  theme: "night",
  variables: {
    colorBackground: "#0a0a0a",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1a1",
    colorPrimary: "#e5e5e5",
    colorDanger: "#ff6467",
    borderRadius: "0px",
  },
};

type ShippingAddress = { name: string; address: CheckoutFormAddress };

type UpdateShippingResponse = { ok: boolean; message?: string };

// Only these three feed getShippingRate (see update-shipping/route.ts), so
// only a change to one of them needs a new quote.
function rateKey(address: CheckoutFormAddress): string {
  return [address.country, address.postal_code, address.city]
    .map((part) => part?.trim().toUpperCase() ?? "")
    .join("|");
}

type EmbeddedCheckoutMountProps = {
  clientSecret: string;
};

// Stripe's embedded form (ui_mode "form", see src/lib/actions/checkout.ts).
// The form collects the address; the price of shipping is ours to set. Every
// completed address is quoted via /api/checkout/update-shipping inside
// runServerUpdate, and — since the form has no built-in way to reject an
// address — payment is only confirmed once the address currently in the form
// has a successful quote. Otherwise the buyer could pay the default IT rate
// the session was created with, whatever their real address.
export function EmbeddedCheckoutMount({ clientSecret }: EmbeddedCheckoutMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let form: StripeCheckoutForm | null = null;
    let cancelled = false;

    async function mount() {
      const stripe = await stripePromise;
      if (cancelled) return;
      if (!stripe) throw new Error("Stripe.js failed to load");

      const checkout = stripe.initCheckoutFormSdk({ clientSecret, appearance: APPEARANCE });
      const loaded = await checkout.loadActions();
      if (cancelled) return;
      if (loaded.type !== "success") throw new Error(loaded.error.message);
      const actions = loaded.actions;

      // Rate key the session's shipping_options currently price. null = the
      // default IT quote from session creation, or unknown after a failed
      // update (runServerUpdate can time out while our request still lands),
      // and never counts as a valid quote.
      let quotedKey: string | null = null;
      // Quotes run one at a time, in order, so a slow earlier request can
      // never overwrite the rate for a newer address.
      let queue: Promise<unknown> = Promise.resolve();
      let pending: { key: string; result: Promise<boolean> } | null = null;

      async function requestQuote(shippingAddress: ShippingAddress, key: string): Promise<boolean> {
        if (key === quotedKey) {
          setShippingError(null);
          return true;
        }

        let serverMessage: string | null = null;
        try {
          const result = await actions.runServerUpdate(async () => {
            const response = await fetch("/api/checkout/update-shipping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                checkoutSessionId: actions.getSession().id,
                shippingDetails: shippingAddress,
              }),
            });
            const data = (await response.json()) as UpdateShippingResponse;
            if (!data.ok) {
              serverMessage = data.message ?? SHIPPING_UNAVAILABLE_MESSAGE;
              throw new Error(serverMessage);
            }
          });
          if (result.type !== "success") throw new Error(result.error.message);

          quotedKey = key;
          if (!cancelled) setShippingError(null);
          return true;
        } catch {
          quotedKey = null;
          if (!cancelled) setShippingError(serverMessage ?? SHIPPING_UNAVAILABLE_MESSAGE);
          return false;
        }
      }

      function quote(shippingAddress: ShippingAddress): Promise<boolean> {
        const key = rateKey(shippingAddress.address);
        if (pending?.key === key) return pending.result;

        const result = queue.then(() => requestQuote(shippingAddress, key));
        const entry = { key, result };
        pending = entry;
        queue = result;
        void result.finally(() => {
          if (pending === entry) pending = null;
        });
        return result;
      }

      const instance = checkout.createForm({
        layout: "expanded",
        // Wallet buttons collect the address in their own sheet and bypass
        // the server-side shipping update entirely (Stripe documents this
        // limitation), so they could only ever pay the default IT rate.
        expressCheckout: {
          paymentMethods: {
            amazonPay: "never",
            applePay: "never",
            googlePay: "never",
            link: "never",
            paypal: "never",
            klarna: "never",
          },
        },
      });

      instance.on("change", (event) => {
        const shippingAddress = event.value.shippingAddress;
        if (!shippingAddress || !event.status.shippingAddress?.complete) return;
        void quote(shippingAddress);
      });

      instance.on("confirm", async (event) => {
        // Unreachable while wallets are disabled above — fail closed rather
        // than let one through on an unpriced address.
        if (event.source === "checkout-form-ece") {
          event.paymentFailed({ reason: "fail", message: SHIPPING_UNAVAILABLE_MESSAGE });
          return;
        }

        const { value, status } = await instance.getValue();
        // No complete address: nothing to price yet, and Stripe's own
        // validation refuses to confirm without one.
        const shippingAddress = status.shippingAddress?.complete ? value.shippingAddress : undefined;
        if (shippingAddress && !(await quote(shippingAddress))) return;

        try {
          await actions.confirm({ formConfirmEvent: event });
        } catch (error) {
          console.error("checkout: confirm failed", error);
        }
      });

      if (cancelled) {
        instance.destroy();
        return;
      }

      form = instance;
      if (containerRef.current) instance.mount(containerRef.current);
      setReady(true);
    }

    mount().catch(() => {
      if (!cancelled) setLoadError(LOAD_ERROR_MESSAGE);
    });

    return () => {
      cancelled = true;
      form?.destroy();
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
      {shippingError && (
        <p
          role="alert"
          className="mb-4 border border-destructive px-3 py-2 text-xs text-destructive uppercase tracking-[0.05em]"
        >
          {shippingError}
        </p>
      )}
      <div ref={containerRef} />
    </>
  );
}
