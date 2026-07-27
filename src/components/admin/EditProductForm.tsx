"use client";

import { useActionState, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  CaretLeftIcon,
  CaretRightIcon,
  CircleNotchIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductDetailsFields } from "@/components/admin/ProductFormFields";
import { updateProduct } from "@/lib/actions/update-product";
import type { AdminProduct } from "@/lib/admin/products";
import {
  MAX_IMAGE_FILES,
  MAX_IMAGE_SIZE_BYTES,
  formatFileSize,
  partitionImageFiles,
  type ProductFormState,
} from "@/lib/product-form";
import { cn } from "@/lib/utils";

type EditImageItem =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; file: File; previewUrl: string };

type EditProductFormProps = {
  product: AdminProduct;
};

export function EditProductForm({ product }: EditProductFormProps) {
  const initialState: ProductFormState = {
    error: null,
    fieldErrors: {},
    values: {
      brand: product.brand,
      name: product.name,
      category: product.category,
      size: product.size,
      condition: product.condition,
      price: String(product.price),
      cost: product.cost !== null ? String(product.cost) : "",
      description: product.description ?? "",
      authenticityNotes: product.authenticityNotes ?? "",
      weightGrams: String(product.weightGrams),
      lengthCm: String(product.lengthCm),
      widthCm: String(product.widthCm),
      heightCm: String(product.heightCm),
    },
  };

  const [state, formAction, pending] = useActionState(
    updateProduct.bind(null, product.id),
    initialState
  );

  const [images, setImages] = useState<EditImageItem[]>(() =>
    product.images.map((image) => ({
      key: image.id,
      kind: "existing" as const,
      id: image.id,
      url: image.url,
    }))
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function syncFileInput(next: EditImageItem[]) {
    const dataTransfer = new DataTransfer();
    next.forEach((item) => {
      if (item.kind === "new") dataTransfer.items.add(item.file);
    });
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }
  }

  function addFiles(incoming: FileList | File[]) {
    const { accepted, rejected } = partitionImageFiles(images.length, Array.from(incoming));

    setImageError(rejected.length > 0 ? rejected.map((r) => `${r.name}: ${r.reason}`).join(" · ") : null);

    if (accepted.length === 0) return;

    const newItems: EditImageItem[] = accepted.map((file) => ({
      key: crypto.randomUUID(),
      kind: "new" as const,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => {
      const next = [...prev, ...newItems];
      syncFileInput(next);
      return next;
    });
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((item) => item.key !== key);
      syncFileInput(next);
      return next;
    });
  }

  function moveImage(key: string, direction: -1 | 1) {
    setImages((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      syncFileInput(next);
      return next;
    });
  }

  function openPicker() {
    if (pending) return;
    fileInputRef.current?.click();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (pending) return;
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  }

  const combinedImageError = state.fieldErrors.images ?? imageError;

  const imageOrderValue = JSON.stringify(
    images.map((item) => (item.kind === "existing" ? { type: "existing", id: item.id } : { type: "new" }))
  );

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="space-y-1">
        <Link
          href="/admin/prodotti"
          className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground"
        >
          ← Torna alla lista
        </Link>
        <h1 className="text-sm font-medium tracking-[0.15em] text-foreground uppercase">
          Modifica prodotto
        </h1>
        <p className="text-xs text-muted-foreground">
          {product.brand} — {product.name}
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      )}

      <fieldset disabled={pending} className="space-y-8">
        <div className="space-y-2">
          <Label>Immagini</Label>

          <div
            role="button"
            tabIndex={0}
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!pending) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            aria-disabled={pending}
            className={cn(
              "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-input px-4 py-8 text-center transition-colors",
              isDragging ? "border-foreground bg-muted" : "hover:bg-muted/50",
              pending && "cursor-not-allowed opacity-50"
            )}
          >
            <UploadSimpleIcon className="size-5 text-muted-foreground" />
            <p className="text-xs text-foreground">Trascina le immagini qui o tocca per selezionarle</p>
            <p className="text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
              JPEG, PNG o WEBP · max {MAX_IMAGE_FILES} · {formatFileSize(MAX_IMAGE_SIZE_BYTES)} ciascuna
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            name="images"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
            }}
          />
          <input type="hidden" name="imageOrder" value={imageOrderValue} readOnly />

          {combinedImageError && (
            <p role="alert" className="text-[0.7rem] text-destructive">
              {combinedImageError}
            </p>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((item, index) => (
                <div key={item.key} className="relative aspect-square overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.kind === "existing" ? item.url : item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />

                  {index === 0 && (
                    <span className="absolute top-1 left-1 bg-background/90 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-[0.1em] text-foreground uppercase">
                      Principale
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(item.key)}
                    aria-label="Rimuovi immagine"
                    className="absolute top-1 right-1 flex size-6 items-center justify-center bg-background/90 text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>

                  <div className="absolute bottom-1 left-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(item.key, -1)}
                      disabled={index === 0}
                      aria-label="Sposta prima"
                      className="flex size-6 items-center justify-center bg-background/90 text-foreground disabled:opacity-30"
                    >
                      <CaretLeftIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(item.key, 1)}
                      disabled={index === images.length - 1}
                      aria-label="Sposta dopo"
                      className="flex size-6 items-center justify-center bg-background/90 text-foreground disabled:opacity-30"
                    >
                      <CaretRightIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ProductDetailsFields values={state.values} fieldErrors={state.fieldErrors} />
      </fieldset>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full gap-2 text-xs font-medium tracking-[0.1em] uppercase"
      >
        {pending && <CircleNotchIcon className="size-4 animate-spin" />}
        {pending ? "Salvataggio in corso…" : "Salva modifiche"}
      </Button>
    </form>
  );
}
