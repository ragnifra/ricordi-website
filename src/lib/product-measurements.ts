// Garment measurements: what products.measurements (jsonb) holds, and how it
// is read back safely.
//
// Display only — nothing here feeds shipping. weight_grams and the three
// length_/width_/height_cm columns describe the PARCEL and stay untouched.
//
// Client-importable on purpose — no server-only imports here.
import {
  MEASUREMENT_FIELDS,
  getMeasurementFields,
  isMeasurementFieldId,
  type MeasurementFieldId,
} from "@/lib/taxonomy";

// Every field is optional, in centimetres, keyed by field id — never by
// label, so relabelling a field can't orphan the values saved under it.
export type Measurements = Partial<Record<MeasurementFieldId, number>>;

// A garment measurement in cm. The upper bound is a sanity check, not a real
// limit: it exists so a mistyped value can't be stored.
export const MAX_MEASUREMENT_CM = 400;

export function isValidMeasurement(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= MAX_MEASUREMENT_CM;
}

// jsonb is schemaless, so anything could be in there: keys that are no longer
// fields, values that aren't numbers. Both are dropped rather than trusted.
export function parseStoredMeasurements(value: unknown): Measurements | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const parsed: Measurements = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isMeasurementFieldId(key)) continue;
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!isValidMeasurement(numeric)) continue;
    parsed[key] = numeric;
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

const measurementFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

export function formatMeasurement(value: number): string {
  return `${measurementFormatter.format(value)} cm`;
}

export type MeasurementEntry = {
  id: MeasurementFieldId;
  label: string;
  value: number;
};

// The filled measurements of a product, in its category's profile order.
// Values stored under a field the category no longer prompts for (the piece
// was recategorised after the fact) are appended rather than hidden.
export function listMeasurements(
  category: string,
  measurements: Measurements | null
): MeasurementEntry[] {
  if (!measurements) return [];

  const profileFields = getMeasurementFields(category);
  const ordered: MeasurementFieldId[] = [
    ...profileFields,
    ...(Object.keys(measurements) as MeasurementFieldId[]).filter(
      (id) => !profileFields.includes(id)
    ),
  ];

  const entries: MeasurementEntry[] = [];

  for (const id of ordered) {
    const value = measurements[id];
    if (value === undefined) continue;
    entries.push({ id, label: MEASUREMENT_FIELDS[id], value });
  }

  return entries;
}
