"use client";

import { useActionState, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CircleNotchIcon,
  UploadSimpleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductDetailsFields } from "@/components/admin/ProductFormFields";
import { updateProduct } from "@/lib/actions/update-product";
import type { AdminProduct } from "@/lib/admin/products";
import { uploadImageFiles, type UploadOutcome } from "@/lib/admin/upload-image";
import {
  MAX_IMAGE_FILES,
  MAX_SOURCE_IMAGE_SIZE_BYTES,
  formatFileSize,
  partitionImageFiles,
  type ProductFormState,
} from "@/lib/product-form";
import { cn } from "@/lib/utils";

// This form has its own picker rather than using ImagePicker, because it
// interleaves images already on the product with newly added ones in a single
// reorderable list. Only the presentation is duplicated: the compress → mint
// slot → upload sequence lives in uploadImageFiles and is shared, so a fix to
// how uploading works cannot land in one picker and miss the other.
type EditImageItem =
  | { key: string; kind: "existing"; id: string; url: string }
  | {
      key: string;
      kind: "new";
      file: File;
      previewUrl: string;
      status: "uploading" | "done" | "failed";
      path?: string;
      error?: string;
    };

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
      gender: product.gender,
      category: product.category,
      size: product.size,
      condition: product.condition,
      price: String(product.price),
      cost: product.cost !== null ? String(product.cost) : "",
      composition: product.composition ?? "",
      description: product.description ?? "",
      authenticityNotes: product.authenticityNotes ?? "",
      weightGrams: String(product.weightGrams),
      lengthCm: String(product.lengthCm),
      widthCm: String(product.widthCm),
      heightCm: String(product.heightCm),
      measurements: Object.fromEntries(
        Object.entries(product.measurements ?? {}).map(([field, value]) => [field, String(value)])
      ),
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

  // An upload still running would save the product without that photo, and a
  // failed one needs the admin to retry or remove it rather than quietly
  // disappear from the product.
  const uploadsBusy = images.some((item) => item.kind === "new" && item.status !== "done");

  function applyOutcomes(keys: string[], outcomes: UploadOutcome[]) {
    setImages((prev) =>
      prev.map((item) => {
        if (item.kind !== "new") return item;

        const index = keys.indexOf(item.key);
        if (index === -1) return item;

        const outcome = outcomes[index];
        if (!outcome) return item;

        return outcome.ok
          ? { ...item, status: "done" as const, path: outcome.path, error: undefined }
          : { ...item, status: "failed" as const, path: undefined, error: outcome.message };
      })
    );
  }

  async function addFiles(incoming: FileList | File[]) {
    const { accepted, rejected } = partitionImageFiles(
      {
        count: images.length,
        bytes: images.reduce(
          (total, item) => total + (item.kind === "new" ? item.file.size : 0),
          0
        ),
      },
      Array.from(incoming)
    );

    setImageError(
      rejected.length > 0 ? rejected.map((r) => `${r.name}: ${r.reason}`).join(" · ") : null
    );

    if (accepted.length === 0) return;

    const newItems: EditImageItem[] = accepted.map((file) => ({
      key: crypto.randomUUID(),
      kind: "new" as const,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading" as const,
    }));

    setImages((prev) => [...prev, ...newItems]);

    const outcomes = await uploadImageFiles(accepted);
    applyOutcomes(
      newItems.map((item) => item.key),
      outcomes
    );
  }

  async function retryImage(key: string) {
    const target = images.find((item) => item.key === key);
    if (!target || target.kind !== "new") return;

    setImages((prev) =>
      prev.map((item) =>
        item.key === key && item.kind === "new"
          ? { ...item, status: "uploading" as const, error: undefined }
          : item
      )
    );

    const outcomes = await uploadImageFiles([target.file]);
    applyOutcomes([key], outcomes);
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.key !== key);
    });
  }

  function moveImage(key: string, direction: -1 | 1) {
    setImages((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
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
    if (event.dataTransfer.files?.length) void addFiles(event.dataTransfer.files);
  }

  const uploadingCount = images.filter(
    (item) => item.kind === "new" && item.status === "uploading"
  ).length;
  const failedCount = images.filter(
    (item) => item.kind === "new" && item.status === "failed"
  ).length;

  const statusError =
    failedCount > 0
      ? `${failedCount} immagine/i non caricate. Riprova o rimuovile prima di salvare.`
      : null;

  const combinedImageError = state.fieldErrors.images ?? imageError ?? statusError;

  // Existing images by id, new ones by the storage path the browser wrote them
  // to. Only finished uploads are listed; `uploadsBusy` blocks submit until
  // that is every new image.
  const imageOrderValue = JSON.stringify(
    images
      .filter((item) => item.kind === "existing" || item.status === "done")
      .map((item) =>
        item.kind === "existing"
          ? { type: "existing", id: item.id }
          : { type: "new", path: item.path }
      )
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
            <p className="text-xs text-foreground">
              Trascina le immagini qui o tocca per selezionarle
            </p>
            <p className="text-[0.65rem] tracking-[0.1em] text-muted-foreground uppercase">
              Max {MAX_IMAGE_FILES} · {formatFileSize(MAX_SOURCE_IMAGE_SIZE_BYTES)} ciascuna ·
              compresse automaticamente
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            // See the same list in ImagePicker: HEIC is offered on purpose and
            // handled by compressImageFile.
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files?.length) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input type="hidden" name="imageOrder" value={imageOrderValue} readOnly />

          {uploadingCount > 0 && (
            <p
              role="status"
              className="flex items-center gap-2 text-[0.7rem] text-muted-foreground"
            >
              <CircleNotchIcon className="size-3.5 animate-spin" />
              Caricamento di {uploadingCount} immagine/i in corso…
            </p>
          )}

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
                    className={cn(
                      "h-full w-full object-cover",
                      item.kind === "new" && item.status !== "done" && "opacity-40"
                    )}
                  />

                  {item.kind === "new" && item.status === "uploading" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <CircleNotchIcon className="size-5 animate-spin text-foreground" />
                    </span>
                  )}

                  {item.kind === "new" && item.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => void retryImage(item.key)}
                      title={item.error}
                      aria-label="Riprova il caricamento"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-destructive"
                    >
                      <WarningIcon className="size-5" />
                      <span className="flex items-center gap-1 text-[0.6rem] tracking-widest uppercase">
                        <ArrowClockwiseIcon className="size-3" />
                        Riprova
                      </span>
                    </button>
                  )}

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
        disabled={pending || uploadsBusy}
        className="h-11 w-full gap-2 text-xs font-medium tracking-[0.1em] uppercase"
      >
        {pending && <CircleNotchIcon className="size-4 animate-spin" />}
        {pending
          ? "Salvataggio in corso…"
          : uploadsBusy
            ? "Caricamento immagini…"
            : "Salva modifiche"}
      </Button>
    </form>
  );
}
