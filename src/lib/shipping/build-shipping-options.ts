import type Stripe from "stripe";

import type { ShippingRateResult } from "@/lib/shipping/get-rate";

// Builds the single shipping_options entry Stripe expects from a
// getShippingRate result — shared between session creation (initial default
// quote, src/lib/actions/checkout.ts) and the update-shipping route
// (recalculated quote after an address change,
// src/app/api/checkout/update-shipping/route.ts), so the two never drift in
// shape. Lives outside checkout.ts because "use server" files may only
// export async functions.
export function buildShippingOptions(
  rate: ShippingRateResult
): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: rate.serviceLevel,
        fixed_amount: {
          amount: Math.round(rate.chargedAmount * 100),
          currency: rate.currency.toLowerCase(),
        },
        delivery_estimate:
          rate.estimatedDays != null
            ? {
                minimum: { unit: "business_day", value: rate.estimatedDays },
                maximum: { unit: "business_day", value: rate.estimatedDays },
              }
            : undefined,
      },
    },
  ];
}
