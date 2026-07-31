import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/server";
import { createShipment, ShipmentError } from "@/lib/shipping/create-shipment";
import { buildImageUrl } from "@/lib/catalog";
import { sendPurchaseConfirmationEmail, EmailError } from "@/lib/email/send-purchase-confirmation";

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error("Stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  // Signature verification needs the exact raw bytes Stripe signed, so the
  // body must be read as text before anything else (e.g. request.json())
  // touches it — parsing first would change/consume the raw bytes.
  const rawBody = await request.text();

  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook: signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  // Logged unconditionally (not just on error) so a missing sale can be
  // diagnosed from server logs alone — confirms the event actually reached
  // this deployment with a valid signature, as distinct from Stripe never
  // delivering it (wrong endpoint URL) or delivering it against a mismatched
  // STRIPE_WEBHOOK_SECRET (signature verification above would have failed).
  console.log(`Stripe webhook: received ${event.type}`, { eventId: event.id });

  // From here on, we always return 200: Stripe should not retry an event we
  // successfully received and verified just because our own handling of it
  // failed for a reason a retry won't fix. Failures are logged for
  // investigation instead of surfaced as an HTTP error to Stripe.
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(stripe, event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook: unhandled error processing ${event.type}`, error);
  }

  return new Response(null, { status: 200 });
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  const productId = session.metadata?.product_id;

  if (!productId) {
    console.error(
      "Stripe webhook: checkout.session.completed has no metadata.product_id",
      session.id
    );
    return;
  }

  const supabase = createAdminClient();

  // Atomic compare-and-swap: only claims the sale if the product isn't
  // already "sold". sold_by_session_id records which session made the sale —
  // it's the idempotency key that lets a benign Stripe webhook redelivery of
  // *this* event (the claim below would now fail, since we already marked it
  // sold on the first delivery) be told apart from a genuine double-sale by
  // a *different* session. The reservation window (5 min, see checkout.ts)
  // is much shorter than a Stripe Checkout Session's lifetime (30 min
  // minimum), so a slow-paying customer's hold can lapse and a different
  // buyer's session can sell the item first — that's the genuine-conflict
  // case, and it's this session's — now unearned — payment that must be
  // refunded rather than silently overwriting who actually owns a
  // one-of-a-kind piece.
  const { data: sold, error } = await supabase
    .from("products")
    .update({
      status: "sold",
      sold_at: new Date().toISOString(),
      sold_by_session_id: session.id,
    })
    .eq("id", productId)
    .neq("status", "sold")
    .select(
      "id, name, brand, size, condition, price, weight_grams, length_cm, width_cm, height_cm, product_images(storage_path, position)"
    )
    .maybeSingle();

  if (error) {
    console.error("Stripe webhook: failed to mark product as sold", productId, error);
    return;
  }

  if (sold) {
    // Only the one delivery whose update above actually matched a row (i.e.
    // flipped status away from "sold") reaches this branch — a Stripe retry
    // of the same event, or a concurrent delivery, finds status already
    // "sold" and falls through to the redelivery/conflict handling below
    // instead. That atomic compare-and-swap is what makes shipment creation
    // idempotent; it is never attempted a second time for the same sale.
    //
    // Order of operations: mark sold (above) → create Sendcloud order →
    // send confirmation email. Each step is isolated from the others'
    // failures (see the comments on each function) — a Sendcloud outage
    // must not prevent the confirmation email, and vice versa.
    await createShipmentForSale(supabase, sold, session);
    await sendPurchaseConfirmationForSale(sold, session);
    return;
  }

  const { data: current, error: lookupError } = await supabase
    .from("products")
    .select("sold_by_session_id")
    .eq("id", productId)
    .maybeSingle();

  if (lookupError) {
    console.error(
      "Stripe webhook: failed to look up sold_by_session_id after failed claim",
      productId,
      lookupError
    );
    return;
  }

  if (current?.sold_by_session_id === session.id) {
    console.log("Stripe webhook: benign redelivery of an already-processed sale, ignoring", {
      productId,
      sessionId: session.id,
    });
    return;
  }

  console.error(
    "Stripe webhook: DOUBLE SALE DETECTED — product already sold by another session, refunding",
    {
      productId,
      sessionId: session.id,
      soldBySessionId: current?.sold_by_session_id ?? null,
      paymentIntent: session.payment_intent,
    }
  );

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error(
      "Stripe webhook: cannot refund double sale — session has no payment_intent",
      { productId, sessionId: session.id }
    );
    return;
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "duplicate",
      metadata: { reason: "double_sale_conflict", product_id: productId, session_id: session.id },
    });
    console.error("Stripe webhook: refund issued for double-sold product", {
      productId,
      sessionId: session.id,
      paymentIntent: paymentIntentId,
      refundId: refund.id,
    });
  } catch (refundError) {
    console.error(
      "Stripe webhook: REFUND FAILED for double-sold product — manual intervention required",
      { productId, sessionId: session.id, paymentIntent: paymentIntentId, refundError }
    );
  }
}

type SoldProduct = {
  id: string;
  name: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  product_images: Array<{ storage_path: string; position: number }> | null;
};

type ResolvedRecipient = {
  recipientName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  state: string | null;
  phone: string | null;
  email: string | null;
};

// Shared by createShipmentForSale and sendPurchaseConfirmationForSale — both
// need the same buyer-entered shipping address, and both must fail the same
// way if it's missing. Prefer collected_information.shipping_details —
// populated by our own update-shipping route from the buyer's
// embedded-Checkout address form — and fall back to customer_details,
// Stripe's own post-payment snapshot, if that's somehow missing. Phone/email
// only ever come from customer_details (phone_number_collection + Stripe's
// own email field; shipping_details never carries either).
function resolveShippingRecipient(session: Stripe.Checkout.Session): ResolvedRecipient | null {
  const shippingDetails = session.collected_information?.shipping_details;
  const customerDetails = session.customer_details;
  const address = shippingDetails?.address ?? customerDetails?.address;
  const recipientName = shippingDetails?.name ?? customerDetails?.name;

  if (!address || !recipientName || !address.line1 || !address.city || !address.postal_code || !address.country) {
    return null;
  }

  return {
    recipientName,
    addressLine1: address.line1,
    addressLine2: address.line2 ?? null,
    city: address.city,
    postalCode: address.postal_code,
    country: address.country,
    state: address.state ?? null,
    phone: customerDetails?.phone ?? null,
    email: customerDetails?.email ?? null,
  };
}

// Runs strictly after the product is already marked "sold" (see the caller)
// and must never be able to undo or block that — every path here only logs
// and returns. A Sendcloud outage or bad response must not make Stripe retry
// this event, since a retry would just find status already "sold" and no-op
// anyway (see the compare-and-swap comment above); it would only ever produce
// a log-only failure, never a second attempt. That's why this deliberately
// swallows every error instead of throwing.
async function createShipmentForSale(
  supabase: ReturnType<typeof createAdminClient>,
  product: SoldProduct,
  session: Stripe.Checkout.Session
): Promise<void> {
  const recipient = resolveShippingRecipient(session);

  if (!recipient) {
    console.error(
      "Stripe webhook: cannot create Sendcloud shipment — session has no usable shipping address, create the parcel manually",
      { productId: product.id, sessionId: session.id }
    );
    return;
  }

  try {
    const result = await createShipment({
      orderReference: session.id,
      productId: product.id,
      recipient: {
        name: recipient.recipientName,
        addressLine1: recipient.addressLine1,
        addressLine2: recipient.addressLine2,
        city: recipient.city,
        postalCode: recipient.postalCode,
        country: recipient.country,
        state: recipient.state,
        phone: recipient.phone,
        email: recipient.email,
      },
      pkg: {
        weightGrams: product.weight_grams,
        lengthCm: product.length_cm,
        widthCm: product.width_cm,
        heightCm: product.height_cm,
      },
      productName: product.name,
      productValueEur: product.price,
    });

    const { error: persistError } = await supabase
      .from("products")
      .update({
        sendcloud_parcel_id: result.parcelId,
        tracking_number: result.trackingNumber,
        tracking_url: result.trackingUrl,
        parcel_created_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (persistError) {
      console.error(
        "Stripe webhook: Sendcloud parcel was created but failed to persist on the product row — find it in the Sendcloud panel by order reference and record it manually",
        { productId: product.id, sessionId: session.id, sendcloudParcelId: result.parcelId, persistError }
      );
      return;
    }

    console.log("Stripe webhook: Sendcloud draft parcel created", {
      productId: product.id,
      sessionId: session.id,
      sendcloudParcelId: result.parcelId,
    });
  } catch (shipmentError) {
    const code = shipmentError instanceof ShipmentError ? shipmentError.code : "unknown";
    console.error(
      "Stripe webhook: Sendcloud shipment creation FAILED — create this parcel manually in the Sendcloud panel",
      { productId: product.id, sessionId: session.id, code, shipmentError }
    );
  }
}

// Runs strictly after the product is already marked "sold" and independently
// of createShipmentForSale — neither may affect the other's outcome or the
// webhook's 200 response. Every path here only logs and returns; a Resend
// outage or bad response must not make Stripe retry this event (a retry
// would just find status already "sold" and no-op, same as the shipment
// path above), so this deliberately swallows every error instead of throwing.
async function sendPurchaseConfirmationForSale(
  product: SoldProduct,
  session: Stripe.Checkout.Session
): Promise<void> {
  const buyerEmail = session.customer_details?.email;

  if (!buyerEmail) {
    console.error(
      "Stripe webhook: cannot send purchase confirmation email — session has no buyer email",
      { productId: product.id, sessionId: session.id }
    );
    return;
  }

  const recipient = resolveShippingRecipient(session);

  if (!recipient) {
    console.error(
      "Stripe webhook: cannot send purchase confirmation email — session has no usable shipping address",
      { productId: product.id, sessionId: session.id }
    );
    return;
  }

  const firstImage = (product.product_images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)[0];

  try {
    await sendPurchaseConfirmationEmail(buyerEmail, {
      buyerName: recipient.recipientName,
      product: {
        name: product.name,
        brand: product.brand,
        size: product.size,
        condition: product.condition,
        price: product.price,
        imageUrl: firstImage ? buildImageUrl(firstImage.storage_path) : null,
      },
      shippingAddress: {
        recipientName: recipient.recipientName,
        line1: recipient.addressLine1,
        line2: recipient.addressLine2,
        city: recipient.city,
        postalCode: recipient.postalCode,
        state: recipient.state,
        country: recipient.country,
      },
    });

    console.log("Stripe webhook: purchase confirmation email sent", {
      productId: product.id,
      sessionId: session.id,
    });
  } catch (emailError) {
    const code = emailError instanceof EmailError ? emailError.code : "unknown";
    console.error(
      "Stripe webhook: purchase confirmation email FAILED — buyer will not receive a confirmation, notify them manually if needed",
      { productId: product.id, sessionId: session.id, code, emailError }
    );
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
  const productId = session.metadata?.product_id;

  if (!productId) {
    console.error(
      "Stripe webhook: checkout.session.expired has no metadata.product_id",
      session.id
    );
    return;
  }

  const supabase = createAdminClient();

  // Only release the reservation if it's still "reserved" AND that hold has
  // actually lapsed. The reservation window (5 min) is much shorter than
  // this session's own lifetime (30 min minimum), so by the time this event
  // fires, a *different* buyer may have already legitimately re-reserved the
  // same row (their reserved_until would be in the future). Without the
  // reserved_until check, releasing here would blindly clear that other
  // buyer's active reservation out from under them.
  const { error } = await supabase
    .from("products")
    .update({ status: "available", reserved_until: null })
    .eq("id", productId)
    .eq("status", "reserved")
    .lt("reserved_until", new Date().toISOString());

  if (error) {
    console.error("Stripe webhook: failed to release reservation", productId, error);
  }
}
