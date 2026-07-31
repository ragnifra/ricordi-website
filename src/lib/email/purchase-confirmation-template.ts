// Pure string-building — no secrets, no I/O. See send-purchase-confirmation.ts
// for the Resend call that actually delivers this.

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

const priceFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export type PurchaseConfirmationProduct = {
  name: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  imageUrl: string | null;
};

export type PurchaseConfirmationAddress = {
  recipientName: string;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  state?: string | null;
  country: string;
};

export type PurchaseConfirmationEmailParams = {
  buyerName: string;
  product: PurchaseConfirmationProduct;
  shippingAddress: PurchaseConfirmationAddress;
};

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

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

function addressLines(address: PurchaseConfirmationAddress): string[] {
  const cityLine = [address.postalCode, address.city, address.state].filter(Boolean).join(" ");
  return [address.recipientName, address.line1, address.line2 ?? null, cityLine, address.country].filter(
    (line): line is string => Boolean(line && line.trim())
  );
}

export function buildPurchaseConfirmationEmail(params: PurchaseConfirmationEmailParams): BuiltEmail {
  const { buyerName, product, shippingAddress } = params;
  const priceLabel = priceFormatter.format(product.price);
  const subject = `Ordine confermato — ${product.name}`;

  const imageCell = product.imageUrl
    ? `<td width="140" style="padding:0;">
        <img src="${escapeHtml(product.imageUrl)}" width="140" height="187" alt="${escapeHtml(product.name)}" style="display:block;width:140px;height:187px;object-fit:cover;background-color:${COLOR_CARD};" />
      </td>`
    : `<td width="140" style="padding:0;background-color:${COLOR_CARD};">
        <div style="width:140px;height:187px;"></div>
      </td>`;

  const addressHtml = addressLines(shippingAddress)
    .map((line) => escapeHtml(line))
    .join("<br />");

  const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLOR_BG};">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
      Il tuo ordine da Ricordi Archive è confermato.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${COLOR_CARD};border:1px solid ${COLOR_BORDER};font-family:${FONT_STACK};">
            <tr>
              <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid ${COLOR_BORDER};">
                <p style="margin:0;font-size:14px;letter-spacing:4px;text-transform:uppercase;color:${COLOR_FOREGROUND};font-weight:600;">Ricordi Archive</p>
                <p style="margin:8px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLOR_MUTED};">Archivio di pezzi irripetibili</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 0;">
                <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${COLOR_FOREGROUND};">Ciao ${escapeHtml(buyerName)},</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:${COLOR_FOREGROUND};">
                  grazie per aver scelto Ricordi Archive. Il pezzo che hai scelto è un unicum: da questo
                  momento è ufficialmente tuo, e non tornerà mai più in archivio per nessun altro.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR_BORDER};">
                  <tr>
                    ${imageCell}
                    <td style="padding:16px;vertical-align:top;">
                      <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(product.brand)}</p>
                      <p style="margin:0 0 12px;font-size:14px;color:${COLOR_FOREGROUND};">${escapeHtml(product.name)}</p>
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLOR_MUTED};">Taglia ${escapeHtml(product.size)}</p>
                      <p style="margin:0 0 16px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLOR_MUTED};">${escapeHtml(product.condition)}</p>
                      <p style="margin:0;font-size:15px;font-weight:600;color:${COLOR_FOREGROUND};">${escapeHtml(priceLabel)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0 0 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${COLOR_MUTED};">Indirizzo di spedizione</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:${COLOR_FOREGROUND};">${addressHtml}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;border-top:1px solid ${COLOR_BORDER};">
                <p style="margin:0;font-size:13px;line-height:1.7;color:${COLOR_FOREGROUND};">
                  Il nostro team sta già preparando il tuo ordine con la massima cura. Ti scriveremo di
                  nuovo non appena la spedizione sarà pronta, con tutti i dettagli per seguirla.
                </p>
                <p style="margin:16px 0 0;font-size:13px;color:${COLOR_FOREGROUND};">A presto,<br />il team di Ricordi Archive</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${COLOR_BORDER};text-align:center;">
                <p style="margin:0;font-size:10px;letter-spacing:1px;color:${COLOR_MUTED};">ricordiarchive@hotmail.com</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Ciao ${buyerName},`,
    "",
    "grazie per aver scelto Ricordi Archive. Il pezzo che hai scelto è un unicum: da questo momento è ufficialmente tuo, e non tornerà mai più in archivio per nessun altro.",
    "",
    `${product.brand} — ${product.name}`,
    `Taglia ${product.size} — ${product.condition}`,
    priceLabel,
    "",
    "Indirizzo di spedizione:",
    ...addressLines(shippingAddress),
    "",
    "Il nostro team sta già preparando il tuo ordine con la massima cura. Ti scriveremo di nuovo non appena la spedizione sarà pronta, con tutti i dettagli per seguirla.",
    "",
    "A presto,",
    "il team di Ricordi Archive",
    "ricordiarchive@hotmail.com",
  ].join("\n");

  return { subject, html, text };
}
