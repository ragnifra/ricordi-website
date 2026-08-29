"use client";

import { useActionState } from "react";
import { CheckCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { ProductDetailsFields } from "@/components/admin/ProductFormFields";
import { createProduct, type CreateProductState } from "@/lib/actions/create-product";
import { EMPTY_PRODUCT_FORM_VALUES } from "@/lib/product-form";

const INITIAL_STATE: CreateProductState = {
  error: null,
  fieldErrors: {},
  values: EMPTY_PRODUCT_FORM_VALUES,
};

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, INITIAL_STATE);

  // Non-empty only immediately after a successful submission — used as the
  // remount key for the (otherwise uncontrolled) fields below, so a fresh
  // success clears them without needing an effect to reset state imperatively.
  const resetToken = state.successToken ?? "initial";

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-sm font-medium tracking-[0.15em] text-foreground uppercase">
          Nuovo prodotto
        </h1>
        <p className="text-xs text-muted-foreground">
          Aggiungi un pezzo unico al catalogo. Selezionando più taglie viene creato un prodotto per
          ogni taglia, collegati tra loro.
        </p>
      </div>

      {state.successToken && (
        <p
          role="status"
          className="flex items-center gap-2 border border-foreground bg-foreground/5 px-3 py-2 text-xs text-foreground"
        >
          <CheckCircleIcon className="size-4 shrink-0" />
          Prodotto caricato con successo.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      )}

      <fieldset disabled={pending} className="space-y-8">
        <ImagePicker
          key={`images-${resetToken}`}
          name="images"
          label="Immagini"
          pending={pending}
          serverError={state.fieldErrors.images}
        />

        <ProductDetailsFields
          key={`details-${resetToken}`}
          values={state.values}
          fieldErrors={state.fieldErrors}
          mode="multi"
          pending={pending}
        />
      </fieldset>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full gap-2 text-xs font-medium tracking-widest uppercase"
      >
        {pending && <CircleNotchIcon className="size-4 animate-spin" />}
        {pending ? "Salvataggio in corso…" : "Salva prodotto"}
      </Button>
    </form>
  );
}
