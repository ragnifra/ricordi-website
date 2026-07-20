import "server-only";

const SENDCLOUD_API_BASE = "https://panel.sendcloud.sc/api/v2";
const SENDCLOUD_REQUEST_TIMEOUT_MS = 10_000;
const SHIP_FROM_COUNTRY = "IT";

// Only Italy shipments qualify for the threshold; every other destination
// always pays the real Sendcloud-calculated rate regardless of cart subtotal.
const FREE_SHIPPING_COUNTRY = "IT";
const FREE_SHIPPING_THRESHOLD_EUR = 150;

export type ShippingDestination = {
  country: string; // ISO 3166-1 alpha-2, e.g. "IT"
  postalCode: string;
  city: string;
};

export type ShippingPackage = {
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
};

export type ShippingRateResult = {
  currency: string;
  /** The actual Sendcloud-calculated cost — for internal/margin tracking only, never charged directly when free shipping applies. */
  realAmount: number;
  /** What the customer is actually charged (0 when the free-shipping threshold applies). */
  chargedAmount: number;
  freeShippingApplied: boolean;
  provider: string;
  serviceLevel: string;
  estimatedDays: number | null;
};

export type ShippingRateErrorCode =
  | "config_error"
  | "invalid_input"
  | "network_error"
  | "upstream_error"
  | "no_rates_available";

export class ShippingRateError extends Error {
  readonly code: ShippingRateErrorCode;

  constructor(code: ShippingRateErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ShippingRateError";
    this.code = code;
  }
}

type SendcloudCountryPrice = {
  iso_2: string;
  price?: number | null;
  lead_time_hours?: number | null;
};

type SendcloudShippingMethod = {
  id: number;
  name: string;
  carrier: string;
  countries?: SendcloudCountryPrice[];
};

// The v2 list endpoint has been observed both as a bare array and as a
// { shipping_methods: [...] } paginated wrapper — handled defensively below.
type SendcloudShippingMethodsResponse = SendcloudShippingMethod[] | { shipping_methods: SendcloudShippingMethod[] };

type SendcloudPriceEntry = {
  price: string | null;
  currency: string | null;
  to_country: string;
};

type SendcloudErrorBody = {
  error?: { code?: number; request?: string; message?: string };
};

async function sendcloudRequest<T>(path: string, authHeader: string): Promise<T> {
  let response: Response;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENDCLOUD_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${SENDCLOUD_API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: authHeader },
      signal: controller.signal,
    });
  } catch (error) {
    throw new ShippingRateError("network_error", "Unable to reach the Sendcloud API", { cause: error });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as SendcloudErrorBody | null;
    const message = body?.error?.message;
    throw new ShippingRateError(
      "upstream_error",
      `Sendcloud API returned ${response.status}${message ? `: ${message}` : ""}`
    );
  }

  return (await response.json()) as T;
}

// The carrier/method names Sendcloud enables in the panel for this account —
// matched against `carrier` (exact) or `name` (substring) on each shipping method.
function isCandidateMethod(method: SendcloudShippingMethod): boolean {
  const carrier = method.carrier?.toLowerCase() ?? "";
  const name = method.name?.toLowerCase() ?? "";
  return carrier === "brt" || name.includes("poste italiane");
}

export type GetShippingRateParams = {
  destination: ShippingDestination;
  /** One entry per unique product in the cart. */
  packages: ShippingPackage[];
  /** Cart subtotal in EUR, used only to evaluate the Italy free-shipping threshold. */
  cartSubtotal: number;
};

export async function getShippingRate({
  destination,
  packages,
  cartSubtotal,
}: GetShippingRateParams): Promise<ShippingRateResult> {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new ShippingRateError(
      "config_error",
      "SENDCLOUD_PUBLIC_KEY or SENDCLOUD_SECRET_KEY is not set"
    );
  }

  if (packages.length === 0) {
    throw new ShippingRateError(
      "invalid_input",
      "At least one package is required to calculate a shipping rate"
    );
  }

  const country = destination.country.trim().toUpperCase();
  const postalCode = destination.postalCode.trim();
  const city = destination.city.trim();

  if (!country || !postalCode || !city) {
    throw new ShippingRateError(
      "invalid_input",
      "Destination country, postal code, and city are all required"
    );
  }

  const totalWeightKg = packages.reduce((sum, pkg) => sum + pkg.weight_grams, 0) / 1000;

  if (totalWeightKg <= 0) {
    throw new ShippingRateError("invalid_input", "Total package weight must be greater than zero");
  }

  const authHeader = `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`;

  // 1. Resolve candidate shipping methods (BRT + Poste Italiane Delivery) —
  // `sender_address=all` per Sendcloud's own docs, since zonal carriers
  // require it and we don't pin to one specific configured sender address.
  const methodsResponse = await sendcloudRequest<SendcloudShippingMethodsResponse>(
    `/shipping_methods?sender_address=all&to_country=${encodeURIComponent(country)}&limit=100`,
    authHeader
  );
  const methods = Array.isArray(methodsResponse) ? methodsResponse : methodsResponse.shipping_methods ?? [];
  const candidates = methods.filter(isCandidateMethod);

  if (candidates.length === 0) {
    throw new ShippingRateError(
      "no_rates_available",
      `No BRT or Poste Italiane shipping method available for destination ${country}`
    );
  }

  // 2. Get a price quote per candidate method, keep the cheapest valid one.
  let cheapest: { method: SendcloudShippingMethod; price: number; currency: string } | null = null;

  for (const method of candidates) {
    const query = new URLSearchParams({
      shipping_method_id: String(method.id),
      weight: totalWeightKg.toFixed(3),
      weight_unit: "kilogram",
      from_country: SHIP_FROM_COUNTRY,
      to_country: country,
    });

    let entries: SendcloudPriceEntry[];

    try {
      entries = await sendcloudRequest<SendcloudPriceEntry[]>(`/shipping-price?${query}`, authHeader);
    } catch (error) {
      // A single stale/misconfigured method shouldn't fail the whole lookup —
      // only genuine connectivity issues (network_error) should abort early.
      if (error instanceof ShippingRateError && error.code === "upstream_error") continue;
      throw error;
    }

    const entry = entries.find((candidate) => candidate.price !== null && candidate.currency !== null);
    if (!entry || entry.price === null || entry.currency === null) continue;

    const price = parseFloat(entry.price);
    if (!cheapest || price < cheapest.price) {
      cheapest = { method, price, currency: entry.currency };
    }
  }

  if (!cheapest) {
    throw new ShippingRateError(
      "no_rates_available",
      `No shipping rate available for destination ${country}`
    );
  }

  const realAmount = cheapest.price;
  const freeShippingApplied = country === FREE_SHIPPING_COUNTRY && cartSubtotal >= FREE_SHIPPING_THRESHOLD_EUR;

  if (freeShippingApplied) {
    console.info("[shipping] Italy free-shipping threshold applied — real cost logged for margin tracking", {
      cartSubtotal,
      realShippingCost: realAmount,
      currency: cheapest.currency,
    });
  }

  const leadTimeHours = cheapest.method.countries?.find((entry) => entry.iso_2 === country)?.lead_time_hours;

  return {
    currency: cheapest.currency,
    realAmount,
    chargedAmount: freeShippingApplied ? 0 : realAmount,
    freeShippingApplied,
    provider: cheapest.method.carrier,
    serviceLevel: cheapest.method.name,
    estimatedDays: leadTimeHours != null ? Math.ceil(leadTimeHours / 24) : null,
  };
}
