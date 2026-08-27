"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONDITION_OPTIONS,
  MAX_COMPOSITION_LENGTH,
  measurementFieldName,
  sizeMeasurementFieldName,
  sizeOverrideFieldName,
  type ProductFormFieldErrors,
  type ProductFormMode,
  type ProductFormValues,
} from "@/lib/product-form";
import { getSizesFor } from "@/lib/product-sizes";
import {
  GENDER_OPTIONS,
  getCategoryGroupsForGender,
  getMeasurementFields,
  getParcelDefaults,
  getSizeScale,
  isGender,
  isValidCategoryForGender,
} from "@/lib/taxonomy";
import { Field } from "@/components/admin/Field";
import { MeasurementFields } from "@/components/admin/MeasurementFields";
import { cn } from "@/lib/utils";

type ProductDetailsFieldsProps = {
  values: ProductFormValues;
  fieldErrors: ProductFormFieldErrors;
  // "multi" (the create form) turns the size field into a multi-select over
  // the pair's scale; everything below it is then entered once and shared by
  // every size, with per-size overrides offered next to each size.
  mode?: ProductFormMode;
};

// The four columns that describe the PARCEL, not the garment: they feed
// getShippingRate and Sendcloud, and every one of them is required.
const PARCEL_FIELDS = [
  { key: "weightGrams", label: "Peso (grammi)", overrideLabel: "Peso (g)" },
  { key: "lengthCm", label: "Lunghezza (cm)", overrideLabel: "Lunghezza (cm)" },
  { key: "widthCm", label: "Larghezza (cm)", overrideLabel: "Larghezza (cm)" },
  { key: "heightCm", label: "Altezza (cm)", overrideLabel: "Altezza (cm)" },
] as const;

type ParcelValues = Pick<
  ProductFormValues,
  "weightGrams" | "lengthCm" | "widthCm" | "heightCm"
>;

// The plain-field half of the product form (everything but image
// management), shared between the "new product" and "edit product" forms.
//
// A Client Component because gender and category drive almost everything
// below them: which categories can be picked, which sizes exist, which
// measurements are prompted for, and what the parcel fields are prefilled
// with.
export function ProductDetailsFields({
  values,
  fieldErrors,
  mode = "single",
}: ProductDetailsFieldsProps) {
  const [gender, setGender] = useState(values.gender);
  const [category, setCategory] = useState(values.category);
  const [size, setSize] = useState(values.size);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const [parcel, setParcel] = useState<ParcelValues>({
    weightGrams: values.weightGrams,
    lengthCm: values.lengthCm,
    widthCm: values.widthCm,
    heightCm: values.heightCm,
  });
  // Prefilling stops the moment the admin types a parcel value of their own,
  // and never starts at all when the form opened on a product that already
  // has one (the edit form) — changing category must not silently discard
  // measurements taken off the real parcel.
  const [prefillParcel, setPrefillParcel] = useState(
    !values.weightGrams && !values.lengthCm && !values.widthCm && !values.heightCm
  );

  const categoryGroups = isGender(gender) ? getCategoryGroupsForGender(gender) : [];
  const scale = getSizeScale(gender, category);
  const scaleSizes = getSizesFor(gender, category);
  const measurementFields = getMeasurementFields(category);

  function applyCategory(nextGender: string, nextCategory: string) {
    setGender(nextGender);
    setCategory(nextCategory);

    // Sizes belong to a scale, and the scale belongs to the pair, so anything
    // picked under the previous pair is meaningless now.
    const nextSizes = getSizesFor(nextGender, nextCategory);
    setSize((current) => (nextSizes.includes(current) ? current : ""));
    setSelectedSizes((current) => current.filter((entry) => nextSizes.includes(entry)));

    if (prefillParcel) {
      const defaults = getParcelDefaults(nextCategory);
      if (defaults) {
        setParcel({
          weightGrams: String(defaults.weightGrams),
          lengthCm: String(defaults.lengthCm),
          widthCm: String(defaults.widthCm),
          heightCm: String(defaults.heightCm),
        });
      }
    }
  }

  function handleGenderChange(next: string) {
    // A category that the new gender doesn't offer is dropped rather than
    // left behind as an invalid pair.
    applyCategory(next, isValidCategoryForGender(next, category) ? category : "");
  }

  function handleParcelChange(key: keyof ParcelValues, next: string) {
    setPrefillParcel(false);
    setParcel((current) => ({ ...current, [key]: next }));
  }

  function toggleSize(entry: string) {
    setSelectedSizes((current) =>
      current.includes(entry) ? current.filter((item) => item !== entry) : [...current, entry]
    );
  }

  // A product saved before its scale changed keeps its size: it stays
  // selectable so editing the piece doesn't silently retag it.
  const singleSizeOptions =
    size && !scaleSizes.includes(size) ? [...scaleSizes, size] : [...scaleSizes];

  // Scale order, not click order — the override panels below read as a size
  // run rather than a history of what the admin tapped.
  const orderedSelection = singleSizeOptions.filter((entry) => selectedSizes.includes(entry));

  const parcelHasError = PARCEL_FIELDS.some(({ key }) => Boolean(fieldErrors[key]));

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Genere" htmlFor="gender" error={fieldErrors.gender}>
            <Select
              name="gender"
              required
              value={gender || null}
              onValueChange={(next) => handleGenderChange(next ?? "")}
            >
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Categoria" htmlFor="category" error={fieldErrors.category}>
            <Select
              name="category"
              required
              disabled={!isGender(gender)}
              value={category || null}
              onValueChange={(next) => applyCategory(gender, next ?? "")}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder={isGender(gender) ? "Seleziona" : "Scegli un genere"} />
              </SelectTrigger>
              <SelectContent>
                {categoryGroups.map((group) => (
                  <SelectGroup key={group.department}>
                    <SelectLabel className="tracking-[0.1em] uppercase">
                      {group.department}
                    </SelectLabel>
                    {group.categories.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode === "single" && (
            <Field label="Taglia" htmlFor="size" error={fieldErrors.size}>
              <Select
                name="size"
                required
                disabled={!category}
                value={size || null}
                onValueChange={(next) => setSize(next ?? "")}
              >
                <SelectTrigger id="size" className="w-full">
                  <SelectValue placeholder={category ? "Seleziona" : "Scegli una categoria"} />
                </SelectTrigger>
                <SelectContent>
                  {singleSizeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        {mode === "multi" && (
          <div className="space-y-2">
            <Label className="flex items-center justify-between text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
              <span>Taglie</span>
              {scale && <span className="normal-case">{scale.label}</span>}
            </Label>

            {!category ? (
              <p className="border border-dashed border-input px-3 py-4 text-xs text-muted-foreground">
                Seleziona genere e categoria per vedere le taglie disponibili.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {scaleSizes.map((option) => {
                    const selected = selectedSizes.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSize(option)}
                        className={cn(
                          "h-11 min-w-11 border px-3 text-xs tracking-[0.1em] uppercase transition-colors",
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-input text-muted-foreground hover:border-foreground hover:text-foreground"
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[0.7rem] text-muted-foreground">
                  Ogni taglia selezionata diventa un prodotto a sé, con il proprio stato e la propria
                  pagina. Le immagini vengono caricate una volta sola e condivise.
                </p>
              </>
            )}

            {orderedSelection.map((entry) => (
              <input key={entry} type="hidden" name="sizes" value={entry} readOnly />
            ))}

            {fieldErrors.sizes && (
              <p role="alert" className="text-[0.7rem] text-destructive">
                {fieldErrors.sizes}
              </p>
            )}
          </div>
        )}

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

          <Field
            label="Composizione"
            htmlFor="composition"
            error={fieldErrors.composition}
            optional
          >
            <Input
              id="composition"
              name="composition"
              autoComplete="off"
              maxLength={MAX_COMPOSITION_LENGTH}
              placeholder="es. 80% lana, 20% cashmere"
              defaultValue={values.composition}
            />
          </Field>
        </div>
      </div>

      {mode === "single" && (
        <div className="space-y-2">
          <Label className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
            Misure del capo
          </Label>
          <p className="text-[0.7rem] text-muted-foreground">
            Misure in centimetri, capo disteso. Tutte facoltative: compare solo ciò che compili.
          </p>
          <MeasurementFields
            fields={measurementFields}
            toName={measurementFieldName}
            values={values.measurements}
          />
          {fieldErrors.measurements && (
            <p role="alert" className="text-[0.7rem] text-destructive">
              {fieldErrors.measurements}
            </p>
          )}
        </div>
      )}

      <Field label="Descrizione" htmlFor="description" error={fieldErrors.description} optional>
        <Textarea id="description" name="description" rows={6} defaultValue={values.description} />
        <p className="text-[0.7rem] text-muted-foreground">
          Gli a capo vengono mantenuti. Una riga che inizia con &ldquo;-&rdquo; o &ldquo;•&rdquo;
          diventa un punto elenco.
        </p>
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

      <details open={parcelHasError} className="border border-input">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground">
          Dati spedizione
        </summary>

        <div className="space-y-3 border-t border-input px-3 py-4">
          <p className="text-[0.7rem] text-muted-foreground">
            Misure del pacco, non del capo: servono al corriere per calcolare la tariffa. Precompilate
            in base alla categoria, modificabili in qualsiasi momento.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PARCEL_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label} htmlFor={key} error={fieldErrors[key]}>
                <Input
                  id={key}
                  name={key}
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  required
                  value={parcel[key]}
                  onChange={(event) => handleParcelChange(key, event.target.value)}
                />
              </Field>
            ))}
          </div>
        </div>
      </details>

      {mode === "multi" && orderedSelection.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
            Dettagli per taglia
          </Label>
          <p className="text-[0.7rem] text-muted-foreground">
            Le misure appartengono alla singola taglia e non vengono copiate tra le taglie. Prezzo,
            condizione e dati di spedizione lasciati vuoti usano i valori condivisi qui sopra.
          </p>

          {orderedSelection.map((entry) => (
            <SizeDetailsPanel key={entry} size={entry} measurementFields={measurementFields} />
          ))}
        </div>
      )}
    </>
  );
}

// Collapsed by default: overriding a size is the exception, so the common
// case stays a single set of shared values. Every override field left empty
// falls back to the shared one (see buildSizeVariants) — the measurements are
// the exception, since they belong to this size alone.
function SizeDetailsPanel({
  size,
  measurementFields,
}: {
  size: string;
  measurementFields: ReturnType<typeof getMeasurementFields>;
}) {
  return (
    <details className="border border-input">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground">
        Taglia {size}
      </summary>

      <div className="space-y-5 border-t border-input px-3 py-4">
        <div className="space-y-2">
          <Label className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
            Misure del capo
          </Label>
          <MeasurementFields
            fields={measurementFields}
            toName={(field) => sizeMeasurementFieldName(field, size)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
            Prezzo e condizione
          </Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prezzo (EUR)" htmlFor={sizeOverrideFieldName("price", size)} optional>
              <Input
                id={sizeOverrideFieldName("price", size)}
                name={sizeOverrideFieldName("price", size)}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="Come sopra"
              />
            </Field>

            <Field label="Condizione" htmlFor={sizeOverrideFieldName("condition", size)} optional>
              <Select name={sizeOverrideFieldName("condition", size)} defaultValue="">
                <SelectTrigger id={sizeOverrideFieldName("condition", size)} className="w-full">
                  <SelectValue placeholder="Come sopra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Come sopra</SelectItem>
                  {CONDITION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
            Dati spedizione
          </Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PARCEL_FIELDS.map(({ key, overrideLabel }) => (
              <Field
                key={key}
                label={overrideLabel}
                htmlFor={sizeOverrideFieldName(key, size)}
                optional
              >
                <Input
                  id={sizeOverrideFieldName(key, size)}
                  name={sizeOverrideFieldName(key, size)}
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  placeholder="Come sopra"
                />
              </Field>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
