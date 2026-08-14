"use client";

import { useState } from "react";

import { Field } from "@/components/admin/Field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_OPTIONS,
  CONDITION_OPTIONS,
  sizeOverrideFieldName,
  type ProductFormFieldErrors,
  type ProductFormMode,
  type ProductFormValues,
} from "@/lib/product-form";
import { getSizeScale, getSizesForCategory } from "@/lib/product-sizes";
import { cn } from "@/lib/utils";

type CategorySizeFieldsProps = {
  mode: ProductFormMode;
  values: ProductFormValues;
  fieldErrors: ProductFormFieldErrors;
};

// Category and size, which are the one part of the product form the two modes
// don't share: sizes are driven by the chosen category's scale, and the create
// form picks several of them at once (one product row per size, sharing a
// group_id) with an optional override per size.
export function CategorySizeFields({ mode, values, fieldErrors }: CategorySizeFieldsProps) {
  const [category, setCategory] = useState(values.category);
  const [size, setSize] = useState(values.size);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const scale = getSizeScale(category);
  const scaleSizes = getSizesForCategory(category);

  function handleCategoryChange(next: string) {
    setCategory(next);
    // Sizes belong to a scale, so anything picked under the previous category
    // is meaningless now.
    const nextSizes = getSizesForCategory(next);
    setSize((current) => (nextSizes.includes(current) ? current : ""));
    setSelectedSizes((current) => current.filter((entry) => nextSizes.includes(entry)));
  }

  function toggleSize(entry: string) {
    setSelectedSizes((current) =>
      current.includes(entry) ? current.filter((item) => item !== entry) : [...current, entry]
    );
  }

  // A product saved before its category's scale changed keeps its size: it
  // stays selectable so editing the piece doesn't silently retag it.
  const singleSizeOptions =
    size && !scaleSizes.includes(size) ? [...scaleSizes, size] : [...scaleSizes];

  // Scale order, not click order — the override panels below read as a size
  // run rather than a history of what the admin tapped.
  const orderedSelection = singleSizeOptions.filter((entry) => selectedSizes.includes(entry));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoria" htmlFor="category" error={fieldErrors.category}>
          <Select
            name="category"
            required
            value={category || null}
            onValueChange={(next) => handleCategoryChange(next ?? "")}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
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
              Seleziona una categoria per vedere le taglie disponibili.
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

          {orderedSelection.length > 0 && (
            <div className="space-y-2 pt-2">
              {orderedSelection.map((entry) => (
                <SizeOverridePanel key={entry} size={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Collapsed by default: overriding a size is the exception, so the common
// case stays a single set of shared values. Every field left empty falls back
// to the shared one (see buildSizeVariants).
function SizeOverridePanel({ size }: { size: string }) {
  return (
    <details className="border border-input">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground">
        Personalizza taglia {size}
      </summary>

      <div className="grid grid-cols-1 gap-4 border-t border-input px-3 py-4 sm:grid-cols-2">
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

        <Field label="Peso (grammi)" htmlFor={sizeOverrideFieldName("weightGrams", size)} optional>
          <Input
            id={sizeOverrideFieldName("weightGrams", size)}
            name={sizeOverrideFieldName("weightGrams", size)}
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            placeholder="Come sopra"
          />
        </Field>

        <Field label="Lunghezza (cm)" htmlFor={sizeOverrideFieldName("lengthCm", size)} optional>
          <Input
            id={sizeOverrideFieldName("lengthCm", size)}
            name={sizeOverrideFieldName("lengthCm", size)}
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            placeholder="Come sopra"
          />
        </Field>

        <Field label="Larghezza (cm)" htmlFor={sizeOverrideFieldName("widthCm", size)} optional>
          <Input
            id={sizeOverrideFieldName("widthCm", size)}
            name={sizeOverrideFieldName("widthCm", size)}
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            placeholder="Come sopra"
          />
        </Field>

        <Field label="Altezza (cm)" htmlFor={sizeOverrideFieldName("heightCm", size)} optional>
          <Input
            id={sizeOverrideFieldName("heightCm", size)}
            name={sizeOverrideFieldName("heightCm", size)}
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            placeholder="Come sopra"
          />
        </Field>
      </div>
    </details>
  );
}
