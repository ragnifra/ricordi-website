import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_OPTIONS, CONDITION_OPTIONS } from "@/lib/product-form";
import type { ProductFormFieldErrors, ProductFormValues } from "@/lib/product-form";
import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, optional, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="flex items-center justify-between text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase"
      >
        <span>{label}</span>
        {optional && <span className="text-muted-foreground/70 normal-case">opzionale</span>}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-[0.7rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type ProductDetailsFieldsProps = {
  values: ProductFormValues;
  fieldErrors: ProductFormFieldErrors;
};

// The plain-field half of the product form (everything but image
// management), shared verbatim between the "new product" and "edit product"
// forms.
export function ProductDetailsFields({ values, fieldErrors }: ProductDetailsFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Brand" htmlFor="brand" error={fieldErrors.brand}>
          <Input id="brand" name="brand" required autoComplete="off" defaultValue={values.brand} />
        </Field>

        <Field label="Nome" htmlFor="name" error={fieldErrors.name}>
          <Input id="name" name="name" required autoComplete="off" defaultValue={values.name} />
        </Field>

        <Field label="Categoria" htmlFor="category" error={fieldErrors.category}>
          <Select name="category" required defaultValue={values.category || undefined}>
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

        <Field label="Taglia" htmlFor="size" error={fieldErrors.size}>
          <Input id="size" name="size" required autoComplete="off" defaultValue={values.size} />
        </Field>

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
