import "server-only";

import { Resend } from "resend";

import {
  buildPurchaseConfirmationEmail,
  type PurchaseConfirmationEmailParams,
} from "@/lib/email/purchase-confirmation-template";

// Domain is verified on Resend separately (outside this codebase) — sending
// doesn't need to wait for that, the address is just used as-is.
const SENDER_ADDRESS = "Ricordi Archive <ordini@ricordiarchive.com>";

export type EmailErrorCode = "config_error" | "invalid_input" | "upstream_error";

export class EmailError extends Error {
  readonly code: EmailErrorCode;

  constructor(code: EmailErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmailError";
    this.code = code;
  }
}

// Mirrors src/lib/shipping/create-shipment.ts: throws a typed error on any
// failure, and never itself decides what that means for the caller — see
// sendPurchaseConfirmationForSale in the webhook, which swallows it.
export async function sendPurchaseConfirmationEmail(
  buyerEmail: string,
  params: PurchaseConfirmationEmailParams
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailError("config_error", "RESEND_API_KEY is not set");
  }

  const email = buyerEmail.trim();
  if (!email) {
    throw new EmailError("invalid_input", "Buyer has no email address on the Stripe session");
  }

  const { subject, html, text } = buildPurchaseConfirmationEmail(params);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: SENDER_ADDRESS,
    to: email,
    subject,
    html,
    text,
  });

  if (error) {
    throw new EmailError("upstream_error", `Resend API returned an error: ${error.message}`);
  }
}
