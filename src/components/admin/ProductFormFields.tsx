import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_OPTIONS } from "@/lib/product-form";
import type {
  ProductFormFieldErrors,
  ProductFormMode,
  ProductFormValues,
} from "@/lib/product-form";
import { CategorySizeFields } from "@/components/admin/CategorySizeFields";
import { Field } from "@/components/admin/Field";

type ProductDetailsFieldsProps = {
  values: ProductFormValues;
  fieldErrors: ProductFormFieldErrors;
  // "multi" (the create form) turns the size field into a multi-select over
  // the category's scale; everything below it is then entered once and shared
  // by every size, with per-size overrides offered next to each size.
  mode?: ProductFormMode;
};

// The plain-field half of the product form (everything but image
// management), shared between the "new product" and "edit product" forms.
export function ProductDetailsFields({
  values,
  fieldErrors,
  mode = "single",
}: ProductDetailsFieldsProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand" htmlFor="brand" error={fieldErrors.brand}>
            <Input id="brand" name="brand" required autoComplete="off" defaultValue={values.brand} />
          </Field>

          <Field label="Nome" htmlFor="name" error={fieldErrors.name}>
            <Input id="name" name="name" required autoComplete="off" defaultValue={values.name} />
          </Field>
        </div>

        <CategorySizeFields mode={mode} values={values} fieldErrors={fieldErrors} />

        {mode === "multi" && (
          <p className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
            Valori condivisi da tutte le taglie
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Condizione" htmlFor="condition" error={fieldErrors.condition}>
            <Select name="condition" required defaultValue={values.condition || undefined}>
              <SelectTrigger id="condition" className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Prezzo (EUR)" htmlFor="price" error={fieldErrors.price}>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              defaultValue={values.price}
            />
          </Field>

          <Field label="Costo (privato)" htmlFor="cost" error={fieldErrors.cost} optional>
            <Input
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={values.cost}
            />
          </Field>

          <Field label="Peso (grammi)" htmlFor="weightGrams" error={fieldErrors.weightGrams}>
            <Input
              id="weightGrams"
              name="weightGrams"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              required
              defaultValue={values.weightGrams}
            />
          </Field>

          <Field label="Lunghezza (cm)" htmlFor="lengthCm" error={fieldErrors.lengthCm}>
            <Input
              id="lengthCm"
              name="lengthCm"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              required
              defaultValue={values.lengthCm}
            />
          </Field>

          <Field label="Larghezza (cm)" htmlFor="widthCm" error={fieldErrors.widthCm}>
            <Input
              id="widthCm"
              name="widthCm"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              required
              defaultValue={values.widthCm}
            />
          </Field>

          <Field label="Altezza (cm)" htmlFor="heightCm" error={fieldErrors.heightCm}>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              required
              defaultValue={values.heightCm}
            />
          </Field>
        </div>
      </div>

      <Field label="Descrizione" htmlFor="description" error={fieldErrors.description} optional>
        <Textarea id="description" name="description" rows={4} defaultValue={values.description} />
      </Field>

      <Field
        label="Note di autenticità"
        htmlFor="authenticityNotes"
        error={fieldErrors.authenticityNotes}
        optional
      >
        <Textarea
          id="authenticityNotes"
          name="authenticityNotes"
          rows={3}
          defaultValue={values.authenticityNotes}
        />
      </Field>
    </>
  );
}
