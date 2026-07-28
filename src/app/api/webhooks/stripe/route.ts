import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/server";

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
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Stripe webhook: failed to mark product as sold", productId, error);
    return;
  }

  if (sold) return;

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
