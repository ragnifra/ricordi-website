"use client";

import { Field } from "@/components/admin/Field";
import { Input } from "@/components/ui/input";
import { MAX_MEASUREMENT_CM } from "@/lib/product-measurements";
import { MEASUREMENT_FIELDS, type MeasurementFieldId } from "@/lib/taxonomy";

type MeasurementFieldsProps = {
  fields: readonly MeasurementFieldId[];
  // Builds the form field name for a measurement. The single-product form and
  // each per-size panel of the create form use different builders so their
  // values never collide in one FormData.
  toName: (field: MeasurementFieldId) => string;
  // Raw strings keyed by field id, redisplayed after a rejected submission.
  values?: Record<string, string>;
  placeholder?: string;
};

// The measurement inputs of a category's profile. Every field is optional and
// in centimetres — these describe the garment and are display-only, unlike the
// parcel fields, which feed the carrier.
//
// Each input is keyed by its field id, so switching to a category whose
// profile shares a field keeps what was already typed into it.
export function MeasurementFields({
  fields,
  toName,
  values,
  placeholder = "cm",
}: MeasurementFieldsProps) {
  if (fields.length === 0) {
    return (
      <p className="border border-dashed border-input px-3 py-4 text-xs text-muted-foreground">
        Nessuna misura prevista per questa categoria.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const name = toName(field);
        return (
          <Field key={field} label={MEASUREMENT_FIELDS[field]} htmlFor={name} optional>
            <Input
              id={name}
              name={name}
              type="number"
              step="0.5"
              min="0"
              max={MAX_MEASUREMENT_CM}
              inputMode="decimal"
              placeholder={placeholder}
              defaultValue={values?.[field] ?? ""}
            />
          </Field>
        );
      })}
    </div>
  );
}
