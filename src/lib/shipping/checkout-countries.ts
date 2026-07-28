// The countries embedded Checkout offers in its own address form —
// `shipping_address_collection.allowed_countries` in
// src/lib/actions/checkout.ts is built from this list, so it's the single
// source of truth for which countries are offered at all.
//
// postalCode/city are only used for the default IT quote requested at
// session-creation time, before the buyer has entered a real address (see
// DEFAULT_QUOTE_COUNTRY in checkout.ts) — placeholders because
// getShippingRate requires non-empty values but the current Sendcloud
// integration prices by weight + to_country alone (see
// src/lib/shipping/get-rate.ts). Once the buyer enters their real address,
// src/app/api/checkout/update-shipping/route.ts recalculates using their
// actual postal code/city instead.
export type CheckoutCountryOption = {
  code: string;
  label: string;
  postalCode: string;
  city: string;
};

// EU member states plus the US. Italia is pinned first; the rest are sorted
// alphabetically by Italian label to match how they're presented in the
// selector.
export const CHECKOUT_COUNTRIES: CheckoutCountryOption[] = [
  { code: "IT", label: "Italia", postalCode: "20121", city: "Milano" },
  { code: "AT", label: "Austria", postalCode: "1010", city: "Vienna" },
  { code: "BE", label: "Belgio", postalCode: "1000", city: "Bruxelles" },
  { code: "BG", label: "Bulgaria", postalCode: "1000", city: "Sofia" },
  { code: "CY", label: "Cipro", postalCode: "1010", city: "Nicosia" },
  { code: "HR", label: "Croazia", postalCode: "10000", city: "Zagabria" },
  { code: "DK", label: "Danimarca", postalCode: "1050", city: "Copenaghen" },
  { code: "EE", label: "Estonia", postalCode: "10111", city: "Tallinn" },
  { code: "FI", label: "Finlandia", postalCode: "00100", city: "Helsinki" },
  { code: "FR", label: "Francia", postalCode: "75001", city: "Parigi" },
  { code: "DE", label: "Germania", postalCode: "10115", city: "Berlino" },
  { code: "GR", label: "Grecia", postalCode: "10431", city: "Atene" },
  { code: "IE", label: "Irlanda", postalCode: "D01", city: "Dublino" },
  { code: "LV", label: "Lettonia", postalCode: "1050", city: "Riga" },
  { code: "LT", label: "Lituania", postalCode: "01103", city: "Vilnius" },
  { code: "LU", label: "Lussemburgo", postalCode: "1111", city: "Lussemburgo" },
  { code: "MT", label: "Malta", postalCode: "VLT1117", city: "La Valletta" },
  { code: "NL", label: "Paesi Bassi", postalCode: "1011AB", city: "Amsterdam" },
  { code: "PL", label: "Polonia", postalCode: "00-001", city: "Varsavia" },
  { code: "PT", label: "Portogallo", postalCode: "1000-001", city: "Lisbona" },
  { code: "CZ", label: "Repubblica Ceca", postalCode: "11000", city: "Praga" },
  { code: "RO", label: "Romania", postalCode: "010011", city: "Bucarest" },
  { code: "SK", label: "Slovacchia", postalCode: "81101", city: "Bratislava" },
  { code: "SI", label: "Slovenia", postalCode: "1000", city: "Lubiana" },
  { code: "ES", label: "Spagna", postalCode: "28001", city: "Madrid" },
  { code: "US", label: "Stati Uniti", postalCode: "10001", city: "New York" },
  { code: "SE", label: "Svezia", postalCode: "11121", city: "Stoccolma" },
  { code: "HU", label: "Ungheria", postalCode: "1011", city: "Budapest" },
];

export const CHECKOUT_ALLOWED_COUNTRY_CODES = CHECKOUT_COUNTRIES.map((option) => option.code);

export function findCheckoutCountry(code: string): CheckoutCountryOption | undefined {
  return CHECKOUT_COUNTRIES.find((option) => option.code === code);
}
