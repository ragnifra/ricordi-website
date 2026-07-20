import {
  getShippingRate,
  ShippingRateError,
  type GetShippingRateParams,
} from "@/lib/shipping/get-rate";

// Manual verification endpoint for the Sendcloud integration — never available
// in production. Hit GET /api/dev/shipping-rate-test (optionally
// ?scenario=it-under-threshold|it-over-threshold|non-it) while running the
// dev server, with real SENDCLOUD_PUBLIC_KEY/SENDCLOUD_SECRET_KEY in .env.local.
const SAMPLE_PACKAGES = [{ weight_grams: 800, length_cm: 30, width_cm: 20, height_cm: 10 }];

const SCENARIOS: Record<string, Omit<GetShippingRateParams, "packages">> = {
  "it-under-threshold": {
    destination: { country: "IT", postalCode: "20121", city: "Milano" },
    cartSubtotal: 90,
  },
  "it-over-threshold": {
    destination: { country: "IT", postalCode: "20121", city: "Milano" },
    cartSubtotal: 180,
  },
  "non-it": {
    destination: { country: "FR", postalCode: "75001", city: "Paris" },
    cartSubtotal: 180,
  },
};

export async function GET(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not available in production", { status: 404 });
  }

  const requested = new URL(request.url).searchParams.get("scenario");
  const names = requested ? [requested] : Object.keys(SCENARIOS);

  const results: Record<string, unknown> = {};

  for (const name of names) {
    const scenario = SCENARIOS[name];

    if (!scenario) {
      results[name] = { error: `Unknown scenario "${name}"`, availableScenarios: Object.keys(SCENARIOS) };
      continue;
    }

    try {
      results[name] = await getShippingRate({ ...scenario, packages: SAMPLE_PACKAGES });
    } catch (error) {
      results[name] =
        error instanceof ShippingRateError
          ? { errorCode: error.code, message: error.message }
          : { errorCode: "unknown", message: String(error) };
    }
  }

  return Response.json(results);
}
