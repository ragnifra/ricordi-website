import "server-only";

// v3, not v2: this account gets 403 "Creating parcels via API v2 is not
// available for this account" from the v2 parcel-creation endpoint. Only
// this file was migrated — src/lib/shipping/get-rate.ts's price-lookup
// endpoints are confirmed still working on v2 and are intentionally
// untouched.
//
// v3 has no direct equivalent of v2's `request_label: false` draft parcel:
// every v3 Shipments endpoint (POST /shipments/announce) requires picking a
// carrier up front and announces + generates a real, chargeable label
// immediately, with no draft-only mode. The v3 Orders API (POST /orders)
// is the closest match to the old behavior instead — it creates an
// unshipped draft with no label and no charge, visible in the panel, that a
// separate future "Ship an Order" call would later announce. That's what
// this file now calls.
const SENDCLOUD_API_BASE = "https://panel.sendcloud.sc/api/v3";
const SENDCLOUD_REQUEST_TIMEOUT_MS = 10_000;
const SHIP_FROM_COUNTRY = "IT";

// The v3 Orders API requires every order to be pinned to a Sendcloud
// "integration" id. This account has exactly one, confirmed live via
// GET /api/v3/integrations: id 603814, shop_name "Ricordi Archive - Sito
// Web". Hardcoded rather than env-configured since there's only ever one.
const SENDCLOUD_INTEGRATION_ID = 603814;

// Sendcloud requires country_state (province/state) to be set on the parcel
// for these destinations. Not enforced client-side — a missing value just
// means the draft lands in the panel with that field blank for manual
// completion (see the no-`ship_with` note further below), so this only
// drives a warning.
const COUNTRIES_REQUIRING_STATE = new Set(["US", "CA", "IT", "AU"]);

export type ShipmentRecipient = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2
  state?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ShipmentPackage = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type CreateShipmentParams = {
  /**
   * Stripe Checkout Session id. NOT used as Sendcloud's order_id/order_number
   * (see productId) — a test-mode session id is 66 chars, which trips an
   * undocumented ~64-char cap Sendcloud enforces on those fields. Kept only
   * for traceability, written into order_details.notes (a free-text field
   * with no documented length limit).
   */
  orderReference: string;
  /**
   * Product UUID (36 chars). Used as Sendcloud's order_id and order_number:
   * well under the 64-char cap, and — since a product can only ever be sold
   * once (see AGENTS.md: available → reserved → sold, no re-sale) — just as
   * unique and 1:1 with the sale as the session id was, so v3's
   * order_id+integration upsert idempotency still holds.
   */
  productId: string;
  recipient: ShipmentRecipient;
  pkg: ShipmentPackage;
  productName: string;
  productValueEur: number;
};

export type CreateShipmentResult = {
  parcelId: number;
  /** Null until the order is announced to a carrier — this call never announces, see createShipment. */
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export type ShipmentErrorCode = "config_error" | "invalid_input" | "network_error" | "upstream_error";

export class ShipmentError extends Error {
  readonly code: ShipmentErrorCode;

  constructor(code: ShipmentErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ShipmentError";
    this.code = code;
  }
}

// POST /orders returns { data: [...] } even for a single order — the
// endpoint is a batch upsert (max 100 orders per request; we only ever send
// one). No tracking_number/tracking_url come back here: those only exist
// once an order is actually shipped, which this draft-creation call never
// does — same as the v2 parcel was never announced either.
type SendcloudOrderResponse = {
  data: Array<{
    id: number;
    order_id: string;
    order_number: string;
  }>;
};

type SendcloudErrorBody = {
  errors?: Array<{ status?: string; code?: string; detail?: string; source?: { pointer?: string } }>;
};

// Mirrors src/lib/shipping/get-rate.ts's Basic Auth + error-handling pattern.
export async function createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new ShipmentError("config_error", "SENDCLOUD_PUBLIC_KEY or SENDCLOUD_SECRET_KEY is not set");
  }

  const { recipient, pkg, orderReference, productId, productName, productValueEur } = params;

  const name = recipient.name.trim();
  const addressLine1 = recipient.addressLine1.trim();
  const city = recipient.city.trim();
  const postalCode = recipient.postalCode.trim();
  const country = recipient.country.trim().toUpperCase();

  if (!name || !addressLine1 || !city || !postalCode || !country) {
    throw new ShipmentError(
      "invalid_input",
      "Recipient name, address line 1, city, postal code, and country are all required"
    );
  }

  if (pkg.weightGrams <= 0) {
    throw new ShipmentError("invalid_input", "Package weight must be greater than zero");
  }

  const state = recipient.state?.trim() || undefined;
  if (COUNTRIES_REQUIRING_STATE.has(country) && !state) {
    console.warn(
      "[shipping] createShipment: destination normally requires a state/province, none was collected — the Sendcloud draft will need it filled in manually",
      { orderReference, country }
    );
  }

  const authHeader = `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`;
  const weightKg = pkg.weightGrams / 1000;
  const nowIso = new Date().toISOString();

  // POST /orders is a batch endpoint — the body is a bare array (max 100
  // orders per request; we always send exactly one).
  const requestBody = [
    {
      order_id: productId,
      order_number: productId,
      order_details: {
        integration: { id: SENDCLOUD_INTEGRATION_ID },
        status: { code: "paid" },
        order_created_at: nowIso,
        // No documented length limit on notes (unlike order_id/order_number)
        // — this is where the Stripe session id actually lives now, for
        // tracing an order back to its checkout session.
        notes: `Stripe Checkout Session: ${orderReference}`,
        order_items: [
          {
            name: productName,
            quantity: 1,
            total_price: { value: productValueEur, currency: "EUR" },
            country_of_origin: SHIP_FROM_COUNTRY,
          },
        ],
      },
      payment_details: {
        total_price: { value: productValueEur, currency: "EUR" },
        status: { code: "paid" },
      },
      shipping_address: {
        name,
        address_line_1: addressLine1,
        address_line_2: recipient.addressLine2?.trim() || undefined,
        city,
        postal_code: postalCode,
        country_code: country,
        state_province_code: state,
        phone_number: recipient.phone?.trim() || undefined,
        email: recipient.email?.trim() || undefined,
      },
      // Deliberately no `ship_with` — that's what picks a carrier and, per
      // the module comment above, picking a carrier is what causes v3 to
      // announce and bill immediately. Leaving it unset is what keeps this
      // an unshipped draft, same intent as v2's request_label: false. Do
      // not add it here.
      shipping_details: {
        measurement: {
          weight: { value: weightKg, unit: "kg" },
          dimension: {
            length: pkg.lengthCm,
            width: pkg.widthCm,
            height: pkg.heightCm,
            unit: "cm",
          },
        },
      },
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENDCLOUD_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${SENDCLOUD_API_BASE}/orders`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ShipmentError("network_error", "Unable to reach the Sendcloud API", { cause: error });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as SendcloudErrorBody | null;
    const message = errorBody?.errors?.map((e) => e.detail).filter(Boolean).join("; ") || undefined;
    throw new ShipmentError(
      "upstream_error",
      `Sendcloud API returned ${response.status}${message ? `: ${message}` : ""}`
    );
  }

  const data = (await response.json()) as SendcloudOrderResponse;
  const order = data.data[0];
  if (!order) {
    throw new ShipmentError("upstream_error", "Sendcloud API returned no order in its response");
  }

  return {
    // Reuses the "parcel" naming from before the v3 migration (see the
    // sendcloud_parcel_id column) — it now holds the Sendcloud order id,
    // the closest equivalent identifier in the v3 Orders API.
    parcelId: order.id,
    // Always null here: tracking only exists once an order is actually
    // shipped, which this draft-creation call never does.
    trackingNumber: null,
    trackingUrl: null,
  };
}
