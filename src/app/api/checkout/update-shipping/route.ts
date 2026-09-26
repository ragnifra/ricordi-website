import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/server";
import { getShippingRate, ShippingRateError } from "@/lib/shipping/get-rate";
import { buildShippingOptions } from "@/lib/shipping/build-shipping-options";

const SHIPPING_UNAVAILABLE_MESSAGE = "Spedizione non disponibile per questo paese al momento.";
const GENERIC_ERROR_MESSAGE = "Si è verificato un errore. Riprova.";

// The embedded form's shippingAddress value — only the fields that affect
// the rate are read.
type ShippingDetailsPayload = {
  address?: {
    country?: string | null;
    postal_code?: string | null;
    city?: string | null;
  };
};

type UpdateShippingRequestBody = {
  checkoutSessionId?: string;
  shippingDetails?: ShippingDetailsPayload;
};

// Called from the embedded form (see EmbeddedCheckoutMount.tsx), wrapped in
// the Checkout Form SDK's runServerUpdate, whenever the buyer completes or
// edits their shipping address — and again right before payment if the
// address changed since the last quote. Our rates come from Sendcloud, not
// Stripe, so only our server can compute them and write shipping_options.
// The form collects and stores the address on the session itself; this
// route only prices it.
export async function POST(request: Request): Promise<Response> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("update-shipping: STRIPE_SECRET_KEY is not set");
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as UpdateShippingRequestBody | null;
  const checkoutSessionId = body?.checkoutSessionId;
  const country = body?.shippingDetails?.address?.country?.trim();

  if (!checkoutSessionId || !country) {
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);

  // The product this checkout is for is derived from the Stripe session
  // itself (which only our server could have set at creation time), never
  // from client input — a tampered checkoutSessionId just fails the
  // retrieve below rather than letting a buyer point this at another
  // product's reservation.
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch (error) {
    console.error("update-shipping: failed to retrieve checkout session", checkoutSessionId, error);
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 400 });
  }

  const productId = session.metadata?.product_id;
  if (!productId) {
    console.error("update-shipping: session has no metadata.product_id", checkoutSessionId);
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: product, error: productError } = await admin
    .from("products")
    .select("price, weight_grams, length_cm, width_cm, height_cm")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    console.error("update-shipping: failed to look up product", productId, productError);
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }

  const postalCode = body?.shippingDetails?.address?.postal_code?.trim() || "N/A";
  const city = body?.shippingDetails?.address?.city?.trim() || "N/A";

  try {
    const rate = await getShippingRate({
      destination: { country, postalCode, city },
      packages: [
        {
          weight_grams: product.weight_grams,
          length_cm: product.length_cm,
          width_cm: product.width_cm,
          height_cm: product.height_cm,
        },
      ],
      cartSubtotal: product.price,
    });

    await stripe.checkout.sessions.update(checkoutSessionId, {
      shipping_options: buildShippingOptions(rate),
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ShippingRateError) {
      // Not the buyer's fault and not a broken session — the reservation
      // and the Checkout Session are both left exactly as they are. If they
      // never fix it, the existing reservation hold (checkout.ts) and the
      // checkout.session.expired webhook (see src/app/api/webhooks/stripe/
      // route.ts) release the product the same way an abandoned checkout
      // always has.
      return Response.json({ ok: false, message: SHIPPING_UNAVAILABLE_MESSAGE });
    }

    console.error("update-shipping: unexpected error", checkoutSessionId, productId, error);
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
