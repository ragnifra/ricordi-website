"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/server";

// Stripe's own hard floor for expires_at — it can't be set any lower, and we
// don't try to; see the trade-off note above RESERVATION_MINUTES below.
const STRIPE_SESSION_MINUTES = 30;

// Small safety margin on top of Stripe's floor. `now` is captured before the
// Supabase update below, which costs a few dozen to a few hundred ms — without
// this buffer, expires_at could land a hair under Stripe's hard 30-minute
// minimum by the time Stripe actually processes the request, intermittently
// failing session creation.
const EXPIRY_SAFETY_BUFFER_SECONDS = 60;

// How long a reservation actually holds the product — deliberately much
// shorter than Stripe's 30-minute session floor above.
//
// Trade-off: Stripe's Checkout Session cannot expire in under 30 minutes, but
// most checkout attempts are abandoned (back button, closed tab) long before
// that, and Stripe's back button navigates via browser history rather than
// hitting any redirect URL we control — so there's no reliable way to detect
// "abandoned" server-side. A 30-minute reservation on every attempt would
// lock a one-of-a-kind piece away from other genuine buyers for half an hour
// on every abandoned checkout, which is worse than the alternative: reserve
// for only 5 minutes, let read-time expiry (catalog.ts) make the product
// buyable again immediately after, and accept that a slow-paying customer on
// a still-open Stripe session can occasionally lose the item to someone else
// and still complete payment. That collision is caught and resolved on the
// webhook side (see checkout.session.completed in
// src/app/api/webhooks/stripe/route.ts): the sale is claimed with an atomic
// compare-and-swap, and if it loses that race the payment is refunded
// automatically and logged loudly. Worst case becomes "rare automatic
// refund" instead of "piece unbuyable for 30 minutes."
const RESERVATION_MINUTES = 5;

export async function createCheckoutSession(productId: string): Promise<void> {
  const supabase = createAdminClient();

  const now = new Date();
  const reservedUntil = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000).toISOString();

  // Atomic compare-and-swap: the update only matches (and returns a row) if
  // the product is still "available", or is "reserved" but that reservation
  // has already lapsed (read-time expiry — no cron required). This is what
  // prevents two concurrent buyers from both reserving the same piece.
  const { data: reserved, error: reserveError } = await supabase
    .from("products")
    .update({ status: "reserved", reserved_until: reservedUntil })
    .eq("id", productId)
    .or(`status.eq.available,and(status.eq.reserved,reserved_until.lt.${now.toISOString()})`)
    .select("id, slug, name, price")
    .maybeSingle();

  if (reserveError) throw reserveError;

  if (!reserved) {
    const { data: current } = await supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();

    redirect(current ? `/prodotto/${current.slug}?checkout=unavailable` : "/catalogo");
  }

  let checkoutUrl: string;

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeSecretKey);
    const headersList = await headers();
    const origin =
      headersList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(reserved.price * 100),
            product_data: { name: reserved.name },
          },
          quantity: 1,
        },
      ],
      metadata: { product_id: reserved.id },
      shipping_address_collection: { allowed_countries: ["IT"] },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/prodotto/${reserved.slug}?checkout=success`,
      cancel_url: `${origin}/prodotto/${reserved.slug}?checkout=cancelled`,
      expires_at: Math.floor(now.getTime() / 1000) + STRIPE_SESSION_MINUTES * 60 + EXPIRY_SAFETY_BUFFER_SECONDS,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    checkoutUrl = session.url;
  } catch (error) {
    // Stripe failed after we'd already claimed the product — release the
    // reservation so it doesn't get stuck as "reserved" indefinitely.
    await supabase
      .from("products")
      .update({ status: "available", reserved_until: null })
      .eq("id", productId)
      .eq("status", "reserved");

    throw error;
  }

  redirect(checkoutUrl);
}
