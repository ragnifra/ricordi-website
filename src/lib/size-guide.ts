// The conversion tables behind "Guida alle taglie" on the product page.
//
// Which table a product opens on is derived from its size scale, not from its
// category: every category on jeansUomoUS or pantaloniUomoIT is measured by
// the same men's trouser chart, and so on. That keeps this file untouched when
// a category is added — the category only has to pick a scale.
//
// Client-importable on purpose — no server-only imports here.
import type { SizeScaleId } from "@/lib/taxonomy";

export type SizeGuideTable = {
  id: string;
  // Used as the tab label inside the guide.
  label: string;
  title: string;
  note?: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

export const SIZE_GUIDE_TABLES = {
  abbigliamentoUomo: {
    id: "abbigliamentoUomo",
    label: "Abbigliamento uomo",
    title: "Abbigliamento — Uomo",
    note: "T-shirt, maglieria, camicie, giacche e cappotti.",
    columns: ["Taglia", "IT", "EU", "US/UK"],
    rows: [
      ["XS", "44", "40", "34"],
      ["S", "46", "42", "36"],
      ["M", "48", "44", "38"],
      ["L", "50-52", "46-48", "40-42"],
      ["XL", "54", "50", "44"],
      ["XXL", "56", "52", "46"],
    ],
  },
  pantaloniUomo: {
    id: "pantaloniUomo",
    label: "Pantaloni uomo",
    title: "Pantaloni e jeans — Uomo",
    columns: ["IT", "EU/FR", "US denim", "Girovita"],
    rows: [
      ["44", "38/44", "28-29", "76-78 cm"],
      ["46", "40/46", "30-31", "80-82 cm"],
      ["48", "42/48", "32-33", "84-86 cm"],
      ["50", "44/50", "34-35", "88-90 cm"],
      ["52", "46/52", "36", "92-94 cm"],
      ["54", "48/54", "38", "96-98 cm"],
    ],
  },
  abbigliamentoDonna: {
    id: "abbigliamentoDonna",
    label: "Abbigliamento donna",
    title: "Abbigliamento — Donna",
    note: "Top, maglieria, abiti, gonne, giacche e cappotti.",
    columns: ["Taglia", "IT", "EU", "US", "UK"],
    rows: [
      ["XS", "38", "34", "2", "6"],
      ["S", "40", "36", "4", "8"],
      ["M", "42", "38", "6", "10"],
      ["L", "44", "40", "8", "12"],
      ["XL", "46", "42", "10", "14"],
    ],
  },
  pantaloniDonna: {
    id: "pantaloniDonna",
    label: "Pantaloni donna",
    title: "Pantaloni e jeans — Donna",
    columns: ["IT", "EU/DE", "US denim", "UK"],
    rows: [
      ["38", "34", "24-25", "6"],
      ["40", "36", "26-27", "8"],
      ["42", "38", "28", "10"],
      ["44", "40", "29-30", "12"],
      ["46", "42", "31", "14"],
      ["48", "44", "32-33", "16"],
    ],
  },
  calzature: {
    id: "calzature",
    label: "Calzature",
    title: "Calzature — Uomo e donna",
    columns: ["EU", "US uomo", "US donna", "UK", "Piede"],
    rows: [
      ["36", "4.0", "5.5", "3.5", "22,5 cm"],
      ["37", "5.0", "6.5", "4.5", "23,5 cm"],
      ["38", "6.0", "7.5", "5.0", "24,0 cm"],
      ["39", "6.5", "8.5", "5.5", "24,5 cm"],
      ["40", "7.5", "9.0", "6.5", "25,0 cm"],
      ["41", "8.0", "9.5", "7.0", "26,0 cm"],
      ["42", "8.5", "10.0", "7.5", "26,5 cm"],
      ["43", "9.5", "11.0", "8.5", "27,5 cm"],
      ["44", "10.0", "11.5", "9.0", "28,0 cm"],
      ["45", "11.0", "12.0", "10.0", "29,0 cm"],
    ],
  },
} as const satisfies Record<string, SizeGuideTable>;

export type SizeGuideTableId = keyof typeof SIZE_GUIDE_TABLES;

// Declaration order — the order the guide offers its tabs in.
export const SIZE_GUIDE_TABLE_IDS = Object.keys(SIZE_GUIDE_TABLES) as SizeGuideTableId[];

// Widens the const-literal entry to SizeGuideTable, so consumers see one
// shape (with the optional `note`) rather than a union of five.
export function getSizeGuideTable(id: SizeGuideTableId): SizeGuideTable {
  return SIZE_GUIDE_TABLES[id];
}

// Exhaustive over SIZE_SCALES by construction: adding a scale without saying
// which chart explains it is a type error. `null` means "no conversion to
// show" — a bag has nothing to convert.
const TABLE_FOR_SCALE: Record<SizeScaleId, SizeGuideTableId | null> = {
  alphaUomo: "abbigliamentoUomo",
  alphaDonna: "abbigliamentoDonna",
  pantaloniUomoIT: "pantaloniUomo",
  jeansUomoUS: "pantaloniUomo",
  pantaloniDonnaIT: "pantaloniDonna",
  jeansDonnaUS: "pantaloniDonna",
  scarpeEU: "calzature",
  tagliaUnica: null,
};

export function getSizeGuideTableIdForScale(scaleId: SizeScaleId | null): SizeGuideTableId | null {
  return scaleId ? TABLE_FOR_SCALE[scaleId] : null;
}

// Shown under every table: on resale pieces the garment's own measurements are
// the only reliable reference, and the MISURE block on the product page is
// where they live.
export const SIZE_GUIDE_DISCLAIMER =
  "Le taglie dei brand di lusso e designer vestono spesso strette o oversize rispetto alle conversioni qui sopra. Quando disponibili, le misure del capo indicate nella scheda prodotto sono il riferimento più affidabile.";
