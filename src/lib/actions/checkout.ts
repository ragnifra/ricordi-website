"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/server";
import { getShippingRate, ShippingRateError } from "@/lib/shipping/get-rate";
import { CHECKOUT_ALLOWED_COUNTRY_CODES, findCheckoutCountry } from "@/lib/shipping/checkout-countries";
import { buildShippingOptions } from "@/lib/shipping/build-shipping-options";

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

// The country quoted at session-creation time, before the buyer has entered
// a real shipping address inside embedded Checkout. The update-shipping
// route (src/app/api/checkout/update-shipping/route.ts) replaces this with a
// real quote for their actual country as soon as they fill in the address —
// this is only what's shown for the brief moment before that. Italy since
// it's this business's home market (and the only country the free-shipping
// threshold ever applies to), so it's the least-wrong default.
const DEFAULT_QUOTE_COUNTRY = "IT";

// This runs during the server-rendered GET of /prodotto/[slug]/checkout, not
// in response to a client-side fetch — plain page navigations don't carry an
// Origin header (browsers only send it on fetch/CORS/POST requests), so
// headers().get("origin") is null here even in production. Host/
// x-forwarded-host are present on every request instead, so they're what we
// actually use to build the origin; NEXT_PUBLIC_SITE_URL, when set, takes
// priority so it can pin the canonical domain regardless of the host the
// request came in on (e.g. a Vercel preview alias).
async function resolveSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const protocol = headersList.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${protocol}://${host}`;
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

export async function createCheckoutSession(productId: string): Promise<{ clientSecret: string }> {
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
    .select("id, slug, name, price, weight_grams, length_cm, width_cm, height_cm")
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

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const defaultCountry = findCheckoutCountry(DEFAULT_QUOTE_COUNTRY);
    if (!defaultCountry) {
      throw new Error(`DEFAULT_QUOTE_COUNTRY "${DEFAULT_QUOTE_COUNTRY}" is missing from CHECKOUT_COUNTRIES`);
    }

    const rate = await getShippingRate({
      destination: {
        country: defaultCountry.code,
        postalCode: defaultCountry.postalCode,
        city: defaultCountry.city,
      },
      packages: [
        {
          weight_grams: reserved.weight_grams,
          length_cm: reserved.length_cm,
          width_cm: reserved.width_cm,
          height_cm: reserved.height_cm,
        },
      ],
      cartSubtotal: reserved.price,
    });

    const stripe = new Stripe(stripeSecretKey);
    const origin = await resolveSiteOrigin();

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
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
      // Lets the update-shipping route (called from the client's
      // onShippingDetailsChange handler once the buyer fills in their
      // address) be the only thing allowed to change shipping_options after
      // creation — Stripe would otherwise let its own client recompute it,
      // which we can't do since our rates come from Sendcloud, not Stripe.
      permissions: { update_shipping_details: "server_only" },
      shipping_address_collection: {
        allowed_countries:
          CHECKOUT_ALLOWED_COUNTRY_CODES as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: buildShippingOptions(rate),
      phone_number_collection: { enabled: true },
      return_url: `${origin}/prodotto/${reserved.slug}?checkout=success`,
      expires_at: Math.floor(now.getTime() / 1000) + STRIPE_SESSION_MINUTES * 60 + EXPIRY_SAFETY_BUFFER_SECONDS,
    });

    if (!session.client_secret) throw new Error("Stripe did not return a client secret");

    return { clientSecret: session.client_secret };
  } catch (error) {
    // Failed after we'd already claimed the product — release the
    // reservation so it doesn't get stuck as "reserved" indefinitely.
    await supabase
      .from("products")
      .update({ status: "available", reserved_until: null })
      .eq("id", productId)
      .eq("status", "reserved");

    if (error instanceof ShippingRateError) {
      redirect(`/prodotto/${reserved.slug}?checkout=error`);
    }

    throw error;
  }
}
