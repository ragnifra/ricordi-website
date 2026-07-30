import { createHmac, timingSafeEqual } from "crypto";

import { createAdminClient } from "@/lib/supabase/server";

const SENDCLOUD_API_BASE = "https://panel.sendcloud.sc/api/v3";
const SENDCLOUD_REQUEST_TIMEOUT_MS = 10_000;

// The "parcel" object inside a parcel_status_changed webhook is a flat,
// legacy-style shape (confirmed against Sendcloud's v3 webhooks OpenAPI
// spec) — distinct from the nested address objects the v3 Orders/Shipments
// APIs use elsewhere in this codebase (see
// src/lib/shipping/create-shipment.ts). Only the fields this handler
// actually reads are declared here.
type SendcloudParcelStatusChangedPayload = {
  action: string;
  parcel?: {
    id?: number;
    tracking_number?: string | null;
    order_number?: string | null;
    external_order_id?: string | null;
  };
};

type SendcloudTrackingResponse = {
  tracking_numbers?: Array<{
    tracking_number: string;
    tracking_url?: string | null;
  }>;
};

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("sendcloud-signature");
  if (!signature) {
    return new Response("Missing Sendcloud-Signature header", { status: 400 });
  }

  const webhookSecret = process.env.SENDCLOUD_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Sendcloud webhook: SENDCLOUD_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  // Signature verification needs the exact raw bytes Sendcloud signed, same
  // reasoning as the Stripe webhook (src/app/api/webhooks/stripe/route.ts):
  // parsing first would change/consume the raw bytes.
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, signature, webhookSecret)) {
    console.error("Sendcloud webhook: signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: SendcloudParcelStatusChangedPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("Sendcloud webhook: failed to parse JSON body", error);
    return new Response("Invalid JSON", { status: 400 });
  }

  // From here on, always 200: a signed, well-formed request we successfully
  // received should never be retried just because we chose to ignore it or
  // our own handling of it failed for a reason a retry won't fix — same
  // failure-isolation philosophy as the Stripe webhook.
  try {
    await handleEvent(payload);
  } catch (error) {
    console.error("Sendcloud webhook: unhandled error processing event", error);
  }

  return new Response(null, { status: 200 });
}

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch rather than returning
  // false, so that case has to be handled before calling it.
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function handleEvent(payload: SendcloudParcelStatusChangedPayload): Promise<void> {
  if (payload.action !== "parcel_status_changed") {
    // The only event this endpoint handles. Anything else the panel might
    // later be configured to also send here (integration_connected,
    // return_created, ...) is safely ignored.
    return;
  }

  const trackingNumber = payload.parcel?.tracking_number;
  if (!trackingNumber) {
    // parcel_status_changed fires on every status transition, most of
    // which happen before a label — and therefore a tracking number —
    // exists yet. Nothing to persist.
    return;
  }

  // Orders are created with order_id = order_number = the product UUID
  // (see src/lib/shipping/create-shipment.ts). Sendcloud echoes that back
  // on the resulting parcel as external_order_id and/or order_number
  // depending on which leg of the API produced it, so both are checked.
  const productId = payload.parcel?.external_order_id || payload.parcel?.order_number;
  if (!productId) {
    console.error("Sendcloud webhook: parcel has a tracking number but no product id to match it to", {
      parcelId: payload.parcel?.id,
    });
    return;
  }

  const trackingUrl = await fetchTrackingUrl(trackingNumber);

  const supabase = createAdminClient();

  // trackingNumber is always a real string here (checked above), so this
  // can never blank out an already-populated value. trackingUrl is only
  // included when this delivery's lookup actually returned one — if it
  // came back null (lookup failure, or Sendcloud just doesn't have it yet
  // for this delivery), the field is omitted entirely rather than sent as
  // null, leaving whatever is already stored untouched. Together this
  // makes repeated and out-of-order deliveries safe to just overwrite with.
  const update: { tracking_number: string; tracking_url?: string } = {
    tracking_number: trackingNumber,
  };
  if (trackingUrl) {
    update.tracking_url = trackingUrl;
  }

  const { data: updated, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", productId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Sendcloud webhook: failed to persist tracking info", { productId, error });
    return;
  }

  if (!updated) {
    console.error("Sendcloud webhook: no product matches this parcel's order id — nothing to update", {
      productId,
    });
    return;
  }

  console.log("Sendcloud webhook: tracking info saved", { productId, trackingNumber });
}

// Best-effort only: parcel_status_changed carries a tracking number but not
// a tracking URL, so this looks it up via a separate v3 endpoint. Any
// failure here must not block saving the tracking number itself — same
// error-isolation reasoning as the rest of this file.
async function fetchTrackingUrl(trackingNumber: string): Promise<string | null> {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) {
    console.error(
      "Sendcloud webhook: SENDCLOUD_PUBLIC_KEY or SENDCLOUD_SECRET_KEY is not set, skipping tracking URL lookup"
    );
    return null;
  }

  const authHeader = `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENDCLOUD_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${SENDCLOUD_API_BASE}/parcels/tracking/${encodeURIComponent(trackingNumber)}`,
      { headers: { Authorization: authHeader }, signal: controller.signal }
    );

    if (!response.ok) {
      console.error("Sendcloud webhook: tracking URL lookup failed", {
        trackingNumber,
        status: response.status,
      });
      return null;
    }

    const data = (await response.json()) as SendcloudTrackingResponse;
    const entry =
      data.tracking_numbers?.find((t) => t.tracking_number === trackingNumber) ??
      data.tracking_numbers?.[0];
    return entry?.tracking_url ?? null;
  } catch (error) {
    console.error("Sendcloud webhook: tracking URL lookup errored", { trackingNumber, error });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
