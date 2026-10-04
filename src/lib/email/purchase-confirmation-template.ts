// Pure string-building — no secrets, no I/O. See send-purchase-confirmation.ts
// for the Resend call that actually delivers this. Every customer-facing
// string comes from purchase-confirmation-copy.ts; nothing is written inline
// here except markup.

import { SELLER } from "@/lib/legal/terms";
import {
  EMAIL_COPY,
  firstName,
  isOutsideEu,
  pickEmailLanguage,
  translateCondition,
  type EmailCopy,
} from "@/lib/email/purchase-confirmation-copy";

const FONT_STACK = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Approximates this project's grayscale dark theme (globals.css --background /
// --card / --foreground / --muted-foreground / --border), since email clients
// can't read the site's oklch CSS variables — these are the closest fixed
// hex equivalents at the same lightness steps.
const COLOR_BG = "#0a0a0a";
const COLOR_CARD = "#141414";
const COLOR_BORDER = "#2a2a2a";
const COLOR_FOREGROUND = "#fafafa";
const COLOR_MUTED = "#a3a3a3";

const TERMS_URL = "https://www.ricordiarchive.com/termini-e-condizioni";

export type PurchaseConfirmationProduct = {
  name: string;
  brand: string;
  size: string;
  condition: string;
  imageUrl: string | null;
};

export type PurchaseConfirmationAddress = {
  recipientName: string;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  state?: string | null;
  /** ISO 3166-1 alpha-2 — the same resolved country the Sendcloud order uses. */
  country: string;
};

/** Major units (e.g. 163.9), in the currency the Checkout Session charged. */
export type OrderAmounts = {
  currency: string;
  item: number;
  shipping: number;
  total: number;
};

export type PurchaseConfirmationEmailParams = {
  buyerName: string | null;
  orderNumber: string;
  orderDate: Date;
  product: PurchaseConfirmationProduct;
  amounts: OrderAmounts;
  /** Null when the shipping address could not be resolved → bilingual email, no address block. */
  shippingAddress: PurchaseConfirmationAddress | null;
};

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

// The product UUID is the Sendcloud order_id/order_number (see
// create-shipment.ts), whose notes carry the Stripe session id, which is also
// products.sold_by_session_id — so "RA-3F9A1C2B" traces to the sale through
// the products row whose id starts with those 8 hex chars.
export function orderNumberForProduct(productId: string): string {
  return `RA-${productId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

// Stripe amounts are in the currency's minor unit; these sets are Stripe's
// documented zero- and three-decimal currencies. Only relevant if adaptive
// pricing ever presents a non-EUR currency.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);

export function stripeAmountToMajor(amount: number, currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return amount;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return amount / 1000;
  return amount / 100;
}

// Values here originate from admin-entered product fields and buyer-entered
// checkout data — neither is trusted input (AGENTS.md: authentication isn't
// trust), so anything interpolated into the HTML string below must be escaped.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The ISO code is always printed next to the amount ("163,90 EUR" /
// "EUR 163.90"), so a session presented in another currency can't be misread.
function formatMoney(copy: EmailCopy, amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(copy.locale.number, {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function formatDate(copy: EmailCopy, date: Date): string {
  return new Intl.DateTimeFormat(copy.locale.date, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date);
}

function countryName(copy: EmailCopy, code: string): string {
  try {
    return new Intl.DisplayNames([copy.locale.region], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function addressLines(copy: EmailCopy, address: PurchaseConfirmationAddress): string[] {
  const cityLine = [address.postalCode, address.city, address.state].filter(Boolean).join(" ");
  return [
    address.recipientName,
    address.line1,
    address.line2 ?? null,
    cityLine,
    countryName(copy, address.country),
  ].filter((line): line is string => Boolean(line && line.trim()));
}

function greeting(copy: EmailCopy, buyerName: string | null): string {
  const name = firstName(buyerName);
  return name ? copy.greeting.replace("{first_name}", name) : copy.greetingNoName;
}

function sellerLines(copy: EmailCopy): string[] {
  const d = copy.orderDetails;
  return [
    SELLER.name,
    SELLER.registeredOffice,
    `${d.vatNumber} ${SELLER.vatNumber}`,
    `${d.email} ${SELLER.supportEmail}`,
    `${d.phone} ${SELLER.phone}`,
  ];
}

type DetailRow = { label: string; lines: string[] };

// Everything one language block needs, resolved once and shared by the HTML
// and plain-text renderers so the two parts can't say different things.
type LanguageContent = {
  copy: EmailCopy;
  greeting: string;
  condition: string;
  money: { item: string; shipping: string; total: string };
  address: string[] | null;
  details: DetailRow[];
};

function resolveContent(
  copy: EmailCopy,
  params: PurchaseConfirmationEmailParams,
  showCustoms: boolean
): LanguageContent {
  const { amounts } = params;
  const d = copy.orderDetails;

  const details: DetailRow[] = [
    { label: d.orderNumber, lines: [params.orderNumber] },
    { label: d.orderDate, lines: [formatDate(copy, params.orderDate)] },
    { label: d.payment, lines: [d.paymentValue] },
    { label: d.seller, lines: sellerLines(copy) },
    { label: d.delivery, lines: [d.deliveryText] },
    ...(showCustoms ? [{ label: d.customs, lines: [d.customsText] }] : []),
    { label: d.invoice, lines: [d.invoiceText] },
  ];

  return {
    copy,
    greeting: greeting(copy, params.buyerName),
    condition: translateCondition(copy, params.product.condition),
    money: {
      item: formatMoney(copy, amounts.item, amounts.currency),
      shipping:
        amounts.shipping === 0 ? copy.labels.free : formatMoney(copy, amounts.shipping, amounts.currency),
      total: formatMoney(copy, amounts.total, amounts.currency),
    },
    address: params.shippingAddress ? addressLines(copy, params.shippingAddress) : null,
    details,
  };
}

// ---------------------------------------------------------------------------
// HTML

const SECTION_LABEL_STYLE = `margin:0 0 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLOR_MUTED};`;
const BODY_STYLE = `margin:0;font-size:13px;line-height:1.7;color:${COLOR_FOREGROUND};`;
const SMALL_STYLE = `margin:0;font-size:12px;line-height:1.7;color:${COLOR_FOREGROUND};`;
const WRAP = "word-break:break-word;overflow-wrap:anywhere;";

function row(content: string, style = ""): string {
  return `<tr>
              <td style="padding:0 24px 28px;${WRAP}${style}">
                ${content}
              </td>
            </tr>`;
}

function htmlLines(lines: readonly string[]): string {
  return lines.map(escapeHtml).join("<br />");
}

function moneyRow(label: string, value: string, strong: boolean): string {
  const weight = strong ? "font-weight:600;" : "";
  const border = strong ? `border-top:1px solid ${COLOR_BORDER};` : "";
  return `<tr>
                    <td style="padding:8px 0;${border}font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${strong ? COLOR_FOREGROUND : COLOR_MUTED};${weight}">${escapeHtml(label)}</td>
                    <td align="right" style="padding:8px 0;${border}font-size:13px;color:${COLOR_FOREGROUND};white-space:nowrap;${weight}">${escapeHtml(value)}</td>
                  </tr>`;
}

function renderLanguageHtml(
  content: LanguageContent,
  product: PurchaseConfirmationProduct,
  languageTag: string | null
): string {
  const { copy } = content;

  const imageCell = product.imageUrl
    ? `<td width="112" style="padding:0;vertical-align:top;">
                      <img src="${escapeHtml(product.imageUrl)}" width="112" height="149" alt="${escapeHtml(product.name)}" style="display:block;width:112px;height:149px;object-fit:cover;background-color:${COLOR_BG};" />
                    </td>`
    : `<td width="112" style="padding:0;background-color:${COLOR_BG};">
                      <div style="width:112px;height:149px;"></div>
                    </td>`;

  const tag = languageTag
    ? row(`<p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(languageTag)}</p>`)
    : "";

  const intro = copy.intro.map((p) => `<p style="${BODY_STYLE}margin-top:12px;">${escapeHtml(p)}</p>`).join("");

  const summary = `<p style="${SECTION_LABEL_STYLE}">${escapeHtml(copy.orderSummaryHeading)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR_BORDER};table-layout:fixed;">
                  <tr>
                    ${imageCell}
                    <td style="padding:12px 14px;vertical-align:top;${WRAP}">
                      <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(product.brand)}</p>
                      <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${COLOR_FOREGROUND};">${escapeHtml(product.name)}</p>
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(copy.labels.size)} ${escapeHtml(product.size)}</p>
                      <p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(copy.labels.condition)}: ${escapeHtml(content.condition)}</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                  ${moneyRow(copy.labels.item, content.money.item, false)}
                  ${moneyRow(copy.labels.shipping, content.money.shipping, false)}
                  ${moneyRow(copy.labels.total, content.money.total, true)}
                </table>`;

  const address = content.address
    ? row(`<p style="${SECTION_LABEL_STYLE}">${escapeHtml(copy.shippingAddressHeading)}</p>
                <p style="${BODY_STYLE}">${htmlLines(content.address)}</p>`)
    : "";

  const details = content.details
    .map(
      (detail) => `<p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(detail.label)}</p>
                <p style="${SMALL_STYLE}margin-bottom:16px;">${htmlLines(detail.lines)}</p>`
    )
    .join("\n                ");

  const closing = `${copy.closing.paragraphs.map((p) => `<p style="${BODY_STYLE}margin-bottom:12px;">${escapeHtml(p)}</p>`).join("")}
                <p style="${BODY_STYLE}margin:20px 0;">${htmlLines(copy.closing.signOff)}</p>
                <p style="${BODY_STYLE}color:${COLOR_MUTED};">${escapeHtml(copy.closing.replyNote)}</p>`;

  const w = copy.withdrawal;
  const form = w.modelForm;
  const withdrawal = `<p style="${SECTION_LABEL_STYLE}">${escapeHtml(w.heading)}</p>
                ${w.intro ? `<p style="${SMALL_STYLE}color:${COLOR_MUTED};font-style:italic;margin-bottom:12px;">${escapeHtml(w.intro)}</p>` : ""}
                ${w.clauses.map((c) => `<p style="${SMALL_STYLE}margin-bottom:10px;">${escapeHtml(c)}</p>`).join("\n                ")}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid ${COLOR_BORDER};table-layout:fixed;">
                  <tr>
                    <td style="padding:16px;${WRAP}">
                      <p style="${SMALL_STYLE}margin-bottom:10px;font-weight:600;">${escapeHtml(form.title)}</p>
                      ${form.instructions ? `<p style="${SMALL_STYLE}color:${COLOR_MUTED};font-style:italic;margin-bottom:10px;">${escapeHtml(form.instructions)}</p>` : ""}
                      <p style="${SMALL_STYLE}margin-bottom:10px;">${escapeHtml(form.recipient)}</p>
                      <p style="${SMALL_STYLE}margin-bottom:10px;">${escapeHtml(form.declaration)}</p>
                      ${form.fields.map((f) => `<p style="${SMALL_STYLE}margin-bottom:8px;white-space:pre-wrap;">${escapeHtml(f)}</p>`).join("\n                      ")}
                    </td>
                  </tr>
                </table>`;

  const terms = `<p style="${SMALL_STYLE}"><a href="${TERMS_URL}" style="color:${COLOR_FOREGROUND};text-decoration:underline;">${escapeHtml(copy.termsLinkLabel)}</a><br /><span style="color:${COLOR_MUTED};">${escapeHtml(TERMS_URL).replace(".com/", ".com/<wbr>")}</span></p>`;

  return [
    tag,
    row(`<p style="${BODY_STYLE}">${escapeHtml(content.greeting)}</p>${intro}`),
    row(summary),
    address,
    row(`<p style="${SECTION_LABEL_STYLE}">${escapeHtml(copy.orderDetails.heading)}</p>
                ${details}`),
    row(closing),
    row(withdrawal, `padding-top:28px;border-top:1px solid ${COLOR_BORDER};`),
    row(terms),
  ].join("\n            ");
}

function renderHtml(
  subject: string,
  preheader: string,
  htmlLang: string,
  header: string,
  blocks: string[]
): string {
  const divider = `<tr>
              <td style="padding:0 0 28px;"><div style="border-top:1px solid ${COLOR_BORDER};font-size:0;line-height:0;">&nbsp;</div></td>
            </tr>`;

  return `<!doctype html>
<html lang="${escapeHtml(htmlLang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLOR_BG};">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${COLOR_CARD};border:1px solid ${COLOR_BORDER};font-family:${FONT_STACK};">
            <tr>
              <td style="padding:28px 24px 24px;text-align:center;border-bottom:1px solid ${COLOR_BORDER};">
                <p style="margin:0;font-size:14px;letter-spacing:4px;text-transform:uppercase;color:${COLOR_FOREGROUND};font-weight:600;">${escapeHtml(header)}</p>
              </td>
            </tr>
            <tr><td style="padding:28px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
            ${blocks.join(`\n            ${divider}\n            `)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Plain text

function renderLanguageText(content: LanguageContent, product: PurchaseConfirmationProduct): string {
  const { copy } = content;
  const w = copy.withdrawal;
  const form = w.modelForm;

  const lines: string[] = [
    content.greeting,
    "",
    ...copy.intro,
    "",
    copy.orderSummaryHeading,
    `${product.brand} — ${product.name}`,
    `${copy.labels.size} ${product.size}`,
    `${copy.labels.condition}: ${content.condition}`,
    `${copy.labels.item}: ${content.money.item}`,
    `${copy.labels.shipping}: ${content.money.shipping}`,
    `${copy.labels.total}: ${content.money.total}`,
    "",
    ...(content.address ? [copy.shippingAddressHeading, ...content.address, ""] : []),
    copy.orderDetails.heading,
    ...content.details.flatMap((detail) => [`${detail.label}:`, ...detail.lines, ""]),
    ...copy.closing.paragraphs.flatMap((p) => [p, ""]),
    ...copy.closing.signOff,
    "",
    copy.closing.replyNote,
    "",
    "----------------------------------------",
    w.heading,
    ...(w.intro ? [w.intro, ""] : []),
    ...w.clauses.flatMap((c) => [c, ""]),
    form.title,
    ...(form.instructions ? [form.instructions] : []),
    form.recipient,
    form.declaration,
    ...form.fields,
    "",
    `${copy.termsLinkLabel}: ${TERMS_URL}`,
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------

export function buildPurchaseConfirmationEmail(params: PurchaseConfirmationEmailParams): BuiltEmail {
  const country = params.shippingAddress?.country ?? null;
  const mode = pickEmailLanguage(country);

  // Bilingual means the country is unknown — and so possibly outside the EU.
  // Both customs texts are self-qualifying ("for destinations outside the
  // EU…"), so showing them is accurate either way.
  const showCustoms = country ? isOutsideEu(country) : true;

  if (mode !== "bilingual") {
    const copy: EmailCopy = EMAIL_COPY[mode];
    const content = resolveContent(copy, params, showCustoms);
    return {
      subject: copy.subject,
      html: renderHtml(copy.subject, copy.preheader, copy.locale.html, copy.header, [
        renderLanguageHtml(content, params.product, null),
      ]),
      text: [copy.header, "", renderLanguageText(content, params.product)].join("\n"),
    };
  }

  const it: EmailCopy = EMAIL_COPY.it;
  const en: EmailCopy = EMAIL_COPY.en;
  const itContent = resolveContent(it, params, showCustoms);
  const enContent = resolveContent(en, params, showCustoms);
  const subject = `${it.subject} / ${en.subject}`;

  return {
    subject,
    html: renderHtml(subject, it.preheader, it.locale.html, it.header, [
      renderLanguageHtml(itContent, params.product, it.languageTag),
      renderLanguageHtml(enContent, params.product, en.languageTag),
    ]),
    text: [
      it.header,
      "",
      it.languageTag,
      "",
      renderLanguageText(itContent, params.product),
      "",
      "========================================",
      en.languageTag,
      "",
      renderLanguageText(enContent, params.product),
    ].join("\n"),
  };
}
