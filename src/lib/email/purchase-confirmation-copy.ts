// Every customer-facing string of the order confirmation email, in both
// languages. Pure data + pure helpers — no secrets, no I/O.
//
// - EMAIL_COPY is checked against EmailCopy for BOTH languages, so a key
//   missing (or misspelt) in either one is a compile error, not a blank line
//   in a customer's inbox. Nothing user-facing is written inline in the
//   template.
// - The Italian legal wording (Terms 7.4, 7.6, section 8, Allegato, seller
//   details) is imported from src/lib/legal/terms.ts — the same constants
//   /termini-e-condizioni renders — so it can never be edited here
//   independently of the Terms page.
// - The English legal wording is a courtesy translation supplied by the
//   owner: verbatim, never "improved". It must be updated by hand whenever
//   Terms 7.4, 7.6 or section 8 change.
// - The invoice sentence must stay consistent with Terms 6.4.

import {
  TERMS_7_4_DELIVERY,
  TERMS_7_6_CUSTOMS,
  TERMS_SECTION_8,
  WITHDRAWAL_FORM,
} from "@/lib/legal/terms";
import type { Condition } from "@/lib/product-form";

export type EmailLanguage = "it" | "en";

/** "bilingual" = shipping country unknown: Italian first, then English. */
export type EmailLanguageMode = EmailLanguage | "bilingual";

export type EmailCopy = {
  /** html lang attribute + Intl locales — formatting config, not copy. */
  locale: { html: string; number: string; date: string; region: string };
  languageTag: string;
  subject: string;
  preheader: string;
  header: string;
  /** Contains the {first_name} placeholder. */
  greeting: string;
  greetingNoName: string;
  intro: readonly string[];
  orderSummaryHeading: string;
  labels: {
    size: string;
    condition: string;
    item: string;
    shipping: string;
    total: string;
    free: string;
  };
  /**
   * Keyed by the admin form's own CONDITION_OPTIONS (src/lib/product-form.ts):
   * adding a condition there without translating it here is a compile error.
   */
  conditions: Record<Condition, string>;
  shippingAddressHeading: string;
  orderDetails: {
    heading: string;
    orderNumber: string;
    orderDate: string;
    payment: string;
    paymentValue: string;
    seller: string;
    vatNumber: string;
    email: string;
    phone: string;
    delivery: string;
    deliveryText: string;
    customs: string;
    customsText: string;
    invoice: string;
    invoiceText: string;
  };
  closing: {
    paragraphs: readonly string[];
    signOff: readonly string[];
    replyNote: string;
  };
  withdrawal: {
    heading: string;
    intro: string | null;
    clauses: readonly string[];
    modelForm: {
      title: string;
      instructions: string | null;
      recipient: string;
      declaration: string;
      fields: readonly string[];
    };
  };
  termsLinkLabel: string;
};

export const EMAIL_COPY = {
  it: {
    locale: { html: "it", number: "it-IT", date: "it-IT", region: "it" },
    languageTag: "ITALIANO",
    subject: "Ordine confermato — In preparazione per la spedizione",
    preheader: "Abbiamo preso in carico il tuo ordine. Da questo momento è ufficialmente tuo.",
    header: "RICORDI ARCHIVE",
    greeting: "Ciao {first_name},",
    greetingNoName: "Ciao,",
    intro: [
      "grazie per aver scelto Ricordi Archive.",
      "Il capo che hai selezionato è un autentico pezzo unico: da questo momento appartiene a te ed esce definitivamente dal nostro archivio.",
    ],
    orderSummaryHeading: "RIEPILOGO DELL'ORDINE",
    labels: {
      size: "Taglia",
      condition: "Condizioni",
      item: "Prodotto",
      shipping: "Spedizione",
      total: "Totale",
      free: "Gratuita",
    },
    conditions: {
      "Nuovo con cartellino": "Nuovo con cartellino",
      "Come nuovo": "Come nuovo",
      "Ottime condizioni": "Ottime condizioni",
      "Buone condizioni": "Buone condizioni",
    },
    shippingAddressHeading: "INDIRIZZO DI SPEDIZIONE",
    orderDetails: {
      heading: "DETTAGLI DELL'ORDINE",
      orderNumber: "Numero d'ordine",
      orderDate: "Data",
      payment: "Pagamento",
      paymentValue: "Completato online tramite Stripe",
      seller: "Venditore",
      vatNumber: "P.IVA",
      email: "Email",
      phone: "Tel.",
      delivery: "Consegna",
      deliveryText: TERMS_7_4_DELIVERY,
      customs: "Dazi doganali",
      customsText: TERMS_7_6_CUSTOMS,
      invoice: "Fattura",
      invoiceText:
        "La fattura elettronica verrà emessa entro 24 ore dall'ordine e inviata a questo indirizzo email.",
    },
    closing: {
      paragraphs: [
        "Stiamo preparando il tuo ordine con la massima cura e attenzione ai dettagli.",
        "Non appena il pacco verrà affidato al corriere, riceverai un'email di aggiornamento con il link di tracciamento per monitorare la spedizione in tempo reale.",
      ],
      signOff: ["A presto,", "Il team di Ricordi Archive"],
      replyNote:
        "Per qualsiasi richiesta o chiarimento sul tuo acquisto, rispondi direttamente a questa email.",
    },
    withdrawal: {
      heading: "DIRITTO DI RECESSO",
      intro: null,
      clauses: TERMS_SECTION_8.clauses,
      modelForm: {
        title: WITHDRAWAL_FORM.heading,
        instructions: WITHDRAWAL_FORM.instructions,
        recipient: WITHDRAWAL_FORM.recipient,
        declaration: WITHDRAWAL_FORM.declaration,
        fields: WITHDRAWAL_FORM.fields,
      },
    },
    termsLinkLabel: "Termini e Condizioni di Vendita",
  },
  en: {
    locale: { html: "en", number: "en-IE", date: "en-GB", region: "en" },
    languageTag: "ENGLISH",
    subject: "Order confirmed — Being prepared for shipping",
    preheader: "We have received your order. From this moment it is officially yours.",
    header: "RICORDI ARCHIVE",
    greeting: "Hi {first_name},",
    greetingNoName: "Hi,",
    intro: [
      "thank you for choosing Ricordi Archive.",
      "The piece you selected is a genuine one-of-a-kind item: from this moment it belongs to you and leaves our archive for good.",
    ],
    orderSummaryHeading: "ORDER SUMMARY",
    labels: {
      size: "Size",
      condition: "Condition",
      item: "Item",
      shipping: "Shipping",
      total: "Total",
      free: "Free",
    },
    conditions: {
      "Nuovo con cartellino": "New with tags",
      "Come nuovo": "Like new",
      "Ottime condizioni": "Excellent condition",
      "Buone condizioni": "Good condition",
    },
    shippingAddressHeading: "SHIPPING ADDRESS",
    orderDetails: {
      heading: "ORDER DETAILS",
      orderNumber: "Order number",
      orderDate: "Date",
      payment: "Payment",
      paymentValue: "Completed online via Stripe",
      seller: "Seller",
      vatNumber: "VAT no.",
      email: "Email",
      phone: "Phone",
      delivery: "Delivery",
      deliveryText:
        "Delivery times shown are estimates and run from the moment the parcel is handed to the courier. Delivery in any case takes place within 30 days of the conclusion of the contract, unless otherwise agreed between the parties.",
      customs: "Customs",
      customsText:
        "Shipments outside the European Union: customs duties, taxes and clearance charges, set by the authorities of the destination country, may apply. These charges are borne entirely by the customer and are not included in the price shown or in the shipping costs. Refusing the parcel because these charges have not been paid does not entitle the customer to a refund of the shipping costs incurred.",
      invoice: "Invoice",
      invoiceText:
        "Your electronic invoice will be issued within 24 hours of the order and sent to this email address.",
    },
    closing: {
      paragraphs: [
        "We are preparing your order with the utmost care and attention to detail.",
        "As soon as the parcel is handed to the courier, you will receive an update email with the tracking link so you can follow your shipment in real time.",
      ],
      signOff: ["See you soon,", "The Ricordi Archive team"],
      replyNote: "For any request or question about your purchase, simply reply to this email.",
    },
    withdrawal: {
      heading: "RIGHT OF WITHDRAWAL",
      intro:
        "Courtesy translation. The contract is concluded in Italian and the Italian version of the Terms and Conditions prevails (Terms, art. 2.5).",
      clauses: [
        "8.1 A customer acting as a consumer has the right to withdraw from the contract, without giving any reason, within 14 days from the day on which he or she, or a third party designated by him or her, takes physical possession of the goods.",
        "8.2 To exercise the right of withdrawal, the customer must notify it by an explicit statement sent to ricordiarchive@hotmail.com before the deadline expires, optionally using the model withdrawal form below.",
        "8.3 The goods must be returned within 14 days of notifying the withdrawal, intact, unused, unwashed and unaltered, complete with any tags, labels, accessories and original packaging. The customer is liable for any diminished value of the goods resulting from handling other than what is necessary to establish their nature, characteristics and functioning.",
        "8.4 The direct costs of returning the goods are borne by the customer.",
        "8.5 The Seller reimburses all payments received, including the standard delivery costs paid by the customer, within 14 days of the day on which it is informed of the withdrawal. Reimbursement may be withheld until the goods have been received or until the customer provides evidence of having sent them back. If the customer chose a type of delivery more expensive than the standard one offered, the Seller is not required to reimburse the difference.",
        "8.6 Reimbursement is made using the same means of payment used for the purchase, unless otherwise agreed and in any case at no cost to the customer.",
        "8.7 As the items are unique pieces, in the event of withdrawal the Seller is not obliged to offer a replacement with an equivalent item.",
        "8.8 Hygiene exclusion. Pursuant to art. 59 of the Italian Consumer Code, the right of withdrawal does not apply to the supply of sealed goods which are not suitable for return for hygiene or health protection reasons, if they were unsealed after delivery. This category includes, among others, underwear, socks, swimwear, lingerie and earrings, which are shipped in sealed packaging. The right of withdrawal remains fully exercisable if the sealed packaging has not been opened.",
      ],
      modelForm: {
        title:
          "Model withdrawal form (complete and return this form only if you wish to withdraw from the contract.)",
        instructions: null,
        recipient:
          "To: RICORDI ARCHIVE DI BARUFFI EDOARDO, Via Corelli 36, 61122 Pesaro (PU), Italy, ricordiarchive@hotmail.com",
        declaration:
          "I/We hereby give notice that I/we withdraw from my/our contract of sale of the following goods:",
        fields: [
          "Description of the goods: ______",
          "Order no.: ______",
          "Ordered on: ______  Received on: ______",
          "Name of consumer: ______",
          "Address of consumer: ______",
          "Date: ______",
        ],
      },
    },
    termsLinkLabel: "Terms and Conditions of Sale",
  },
} as const satisfies Record<EmailLanguage, EmailCopy>;

// The email follows the SHIPPING country resolved for the Sendcloud order —
// never the browser locale or the billing country. Unknown → bilingual.
export function pickEmailLanguage(shippingCountry: string | null | undefined): EmailLanguageMode {
  const country = shippingCountry?.trim().toUpperCase();
  if (!country) return "bilingual";
  return country === "IT" ? "it" : "en";
}

// EU-27, explicit rather than derived from CHECKOUT_COUNTRIES so that adding
// a non-EU destination to checkout can't silently drop the customs notice.
const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

export function isOutsideEu(country: string): boolean {
  return !EU_COUNTRY_CODES.has(country.trim().toUpperCase());
}

/** First token of the buyer's name, else the full name, else null (nameless greeting). */
export function firstName(name: string | null | undefined): string | null {
  const full = name?.trim();
  if (!full) return null;
  return full.split(/\s+/)[0] || full;
}

export function translateCondition(copy: EmailCopy, condition: string): string {
  return (copy.conditions as Record<string, string>)[condition] ?? condition;
}
