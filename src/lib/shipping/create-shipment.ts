import "server-only";

const SENDCLOUD_API_BASE = "https://panel.sendcloud.sc/api/v2";
const SENDCLOUD_REQUEST_TIMEOUT_MS = 10_000;
const SHIP_FROM_COUNTRY = "IT";

// Sendcloud requires country_state (province/state) to be set on the parcel
// for these destinations. Not enforced client-side — a missing value just
// means the draft lands in the panel with that field blank for manual
// completion (see request_label note below), so this only drives a warning.
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
  /** Stripe Checkout Session id. Doubles as Sendcloud's order_number/reference/external_reference. */
  orderReference: string;
  recipient: ShipmentRecipient;
  pkg: ShipmentPackage;
  productName: string;
  productValueEur: number;
};

export type CreateShipmentResult = {
  parcelId: number;
  /** Null until the parcel is announced to a carrier — request_label is always false here, see below. */
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

type SendcloudParcelResponse = {
  parcel: {
    id: number;
    tracking_number: string | null;
    tracking_url: string | null;
  };
};

type SendcloudErrorBody = {
  error?: { code?: number; request?: string; message?: string };
};

// Mirrors src/lib/shipping/get-rate.ts's Basic Auth + error-handling pattern.
export async function createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new ShipmentError("config_error", "SENDCLOUD_PUBLIC_KEY or SENDCLOUD_SECRET_KEY is not set");
  }

  const { recipient, pkg, orderReference, productName, productValueEur } = params;

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
  const weightKg = (pkg.weightGrams / 1000).toFixed(3);

  const requestBody = {
    parcel: {
      name,
      address: addressLine1,
      address_2: recipient.addressLine2?.trim() || undefined,
      city,
      postal_code: postalCode,
      country,
      country_state: state,
      telephone: recipient.phone?.trim() || undefined,
      email: recipient.email?.trim() || undefined,
      weight: weightKg,
      length: pkg.lengthCm.toFixed(1),
      width: pkg.widthCm.toFixed(1),
      height: pkg.heightCm.toFixed(1),
      order_number: orderReference,
      reference: orderReference,
      // Sendcloud-side idempotency belt-and-braces: a repeat POST with the
      // same external_reference is rejected (409) rather than creating a
      // second parcel. The primary guard is still the DB-level compare-and-
      // swap in the webhook handler, which is what actually decides whether
      // this function gets called at all — see createShipmentSafely in
      // src/app/api/webhooks/stripe/route.ts.
      external_reference: orderReference,
      // Creates a draft parcel only: it lands in the Sendcloud panel under
      // Shipping > Orders for manual review, awaiting a human to pick a
      // shipping method and generate the label. It does NOT announce to a
      // carrier and does NOT incur any charge — Sendcloud only bills when a
      // label is later requested. Do not change this to true.
      request_label: false,
      parcel_items: [
        {
          description: productName,
          quantity: 1,
          weight: weightKg,
          value: productValueEur.toFixed(2),
          origin_country: SHIP_FROM_COUNTRY,
        },
      ],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENDCLOUD_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${SENDCLOUD_API_BASE}/parcels`, {
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
    const message = errorBody?.error?.message;
    throw new ShipmentError(
      "upstream_error",
      `Sendcloud API returned ${response.status}${message ? `: ${message}` : ""}`
    );
  }

  const data = (await response.json()) as SendcloudParcelResponse;

  return {
    parcelId: data.parcel.id,
    trackingNumber: data.parcel.tracking_number,
    trackingUrl: data.parcel.tracking_url,
  };
}
