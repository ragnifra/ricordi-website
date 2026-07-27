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
// { shipping_methods: [...], next: <url|null> } cursor-paginated wrapper —
// handled defensively below. Pagination matters here: with FedEx enabled,
// a single destination country can return 200+ methods (one per weight
// bracket per service variant), well past a single page.
type SendcloudShippingMethodsResponse =
  | SendcloudShippingMethod[]
  | { shipping_methods: SendcloudShippingMethod[]; next?: string | null };

type SendcloudPriceEntry = {
  price: string | null;
  currency: string | null;
  to_country: string;
};

type SendcloudErrorBody = {
  error?: { code?: number; request?: string; message?: string };
};

async function sendcloudRequestUrl<T>(url: string, authHeader: string): Promise<T> {
  let response: Response;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENDCLOUD_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(url, {
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

function sendcloudRequest<T>(path: string, authHeader: string): Promise<T> {
  return sendcloudRequestUrl<T>(`${SENDCLOUD_API_BASE}${path}`, authHeader);
}

// Follows the cursor-paginated `next` link until exhausted, aggregating
// every page's methods — see the pagination note on
// SendcloudShippingMethodsResponse above for why a single page isn't enough.
async function fetchAllShippingMethods(country: string, authHeader: string): Promise<SendcloudShippingMethod[]> {
  let url: string | null =
    `${SENDCLOUD_API_BASE}/shipping_methods?sender_address=all&to_country=${encodeURIComponent(country)}&limit=100`;
  const methods: SendcloudShippingMethod[] = [];

  while (url) {
    const page: SendcloudShippingMethodsResponse = await sendcloudRequestUrl<SendcloudShippingMethodsResponse>(
      url,
      authHeader
    );
    if (Array.isArray(page)) {
      methods.push(...page);
      url = null;
    } else {
      methods.push(...page.shipping_methods);
      url = page.next ?? null;
    }
  }

  return methods;
}

// The carrier/method names Sendcloud enables in the panel for this account —
// matched against `carrier` (exact). Verified live against the account's raw
// shipping_methods response (IT, and FR/ES/DE/PL/US for international):
//
// - "poste_it_delivery": Poste Italiane's product, exposed as dozens of
//   service-level variants. Domestically (IT) that's weight bracket x
//   Domicilio/Ufficio Postale/Punto Poste/Shop2Home/Shop2Shop; internationally
//   (seen for FR/ES/DE/PL, absent for US) it's weight bracket x "Business
//   International Standard Domicilio" / "International Plus - Consegna a
//   domicilio" (both home delivery) vs. "International Plus Shop2home -
//   Punto Poste" / "... - Ufficio Postale" (pickup-point delivery, despite
//   the "Shop2home" name). We only support street-address checkout (no
//   locker/pickup-point selection in the UI), so in both markets candidates
//   are restricted to names containing "domicilio" — which happens to
//   correctly select the home-delivery variants and exclude the
//   pickup-point ones in every market observed, so no country branch is
//   needed here.
// - "fedex": the only other international-capable carrier active on this
//   account (FR/ES/DE/PL/US all returned ~130-240 "FedEx International
//   Connect Plus" methods, one plain + one "- Signature" variant per weight
//   bracket — a street-address parcel service with no locker/pickup-point
//   equivalent found on this account, so no name filter is needed). Scoped
//   to non-IT destinations only, to leave IT's behavior unchanged.
// - "brt": kept from the account's original configuration; unconditional
//   since no BRT methods have actually been observed for any destination
//   tested so far (this account currently has none active).
function isCandidateMethod(method: SendcloudShippingMethod, country: string): boolean {
  const carrier = method.carrier?.toLowerCase() ?? "";
  const name = method.name?.toLowerCase() ?? "";
  if (carrier === "brt") return true;
  if (carrier === "poste_it_delivery") return name.includes("domicilio");
  if (carrier === "fedex" && country !== SHIP_FROM_COUNTRY) return true;
  return false;
}

// Parses a "<min>-<max>kg" weight bracket out of a method name (every
// variant observed on this account — Poste and FedEx alike — is named this
// way). Returns null if the name doesn't contain one.
function parseWeightBracketKg(name: string): { min: number; max: number } | null {
  const match = name.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*kg/i);
  if (!match) return null;
  return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

// Inclusive on both ends to stay safe about which side of a boundary weight
// (e.g. exactly 0.5kg) a bracket is meant to cover — worst case that queries
// one extra adjacent-bracket method, which is still far cheaper than
// querying every bracket for the whole carrier.
function methodMatchesWeight(method: SendcloudShippingMethod, totalWeightKg: number): boolean {
  const bracket = parseWeightBracketKg(method.name ?? "");
  if (!bracket) return true;
  return totalWeightKg >= bracket.min && totalWeightKg <= bracket.max;
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

  // 1. Resolve candidate shipping methods (BRT/Poste Italiane domestically,
  // Poste Italiane international products + FedEx cross-border) —
  // `sender_address=all` per Sendcloud's own docs, since zonal carriers
  // require it and we don't pin to one specific configured sender address.
  const methods = await fetchAllShippingMethods(country, authHeader);
  const candidates = methods.filter((method) => isCandidateMethod(method, country));

  if (candidates.length === 0) {
    throw new ShippingRateError(
      "no_rates_available",
      `No BRT, Poste Italiane, or FedEx shipping method available for destination ${country}`
    );
  }

  // Carriers on this account expose one method per weight bracket (e.g.
  // "FedEx® International Connect Plus 3.5-4kg" — ~130 such variants alone
  // for a single non-IT destination), and step 2 below has to call
  // /shipping-price once per method it queries. Querying every candidate
  // blindly both wastes calls and — observed live — trips Sendcloud's rate
  // limit well before covering the account's full country list. Narrow to
  // the bracket(s) that actually contain our weight first; methods with no
  // parseable bracket in the name are kept (queried the slow way) rather
  // than silently dropped.
  const weightMatchedCandidates = candidates.filter((method) => methodMatchesWeight(method, totalWeightKg));
  const priceableCandidates = weightMatchedCandidates.length > 0 ? weightMatchedCandidates : candidates;

  // 2. Get a price quote per candidate method, keep the cheapest valid one.
  let cheapest: { method: SendcloudShippingMethod; price: number; currency: string } | null = null;

  for (const method of priceableCandidates) {
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
