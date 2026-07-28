import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/server";
import { getShippingRate, ShippingRateError } from "@/lib/shipping/get-rate";
import { buildShippingOptions } from "@/lib/shipping/build-shipping-options";

const SHIPPING_UNAVAILABLE_MESSAGE = "Spedizione non disponibile per questo paese al momento.";
const GENERIC_ERROR_MESSAGE = "Si è verificato un errore. Riprova.";

type ShippingDetailsPayload = {
  name?: string;
  address?: {
    country?: string;
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    state?: string | null;
  };
};

type UpdateShippingRequestBody = {
  checkoutSessionId?: string;
  shippingDetails?: ShippingDetailsPayload;
};

// Called from the embedded Checkout's onShippingDetailsChange callback (see
// EmbeddedCheckoutMount.tsx) whenever the buyer fills in or edits their
// shipping address. The session is created with
// permissions.update_shipping_details = "server_only" (checkout.ts), which
// is what makes Stripe require this round trip instead of letting its own
// client update shipping_options directly — our rates come from Sendcloud,
// not Stripe, so only our server can compute them.
export async function POST(request: Request): Promise<Response> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("update-shipping: STRIPE_SECRET_KEY is not set");
    return Response.json({ ok: false, message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as UpdateShippingRequestBody | null;
  const checkoutSessionId = body?.checkoutSessionId;
  const name = body?.shippingDetails?.name?.trim();
  const country = body?.shippingDetails?.address?.country?.trim();
  const line1 = body?.shippingDetails?.address?.line1?.trim();

  // name and address.line1 are required by Stripe's
  // collected_information.shipping_details shape — without them we can't
  // persist the address on the session at all, so treat a payload missing
  // either the same as a missing country.
  if (!checkoutSessionId || !name || !country || !line1) {
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
  const line2 = body?.shippingDetails?.address?.line2?.trim() || undefined;
  const state = body?.shippingDetails?.address?.state?.trim() || undefined;

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
      // Without this, Stripe never records the address on the session
      // itself (only the shipping_options rate above), so it keeps
      // reporting shipping details as missing and blocks submission — this
      // is what actually satisfies permissions.update_shipping_details =
      // "server_only" (see the module comment above).
      collected_information: {
        shipping_details: {
          name,
          address: {
            country,
            line1,
            line2,
            city: city === "N/A" ? undefined : city,
            postal_code: postalCode === "N/A" ? undefined : postalCode,
            state,
          },
        },
      },
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
