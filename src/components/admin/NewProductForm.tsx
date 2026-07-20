"use client";

import { useActionState, useRef, useState, type DragEvent } from "react";
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
import { createProduct } from "@/lib/actions/create-product";
import {
  MAX_IMAGE_FILES,
  MAX_IMAGE_SIZE_BYTES,
  formatFileSize,
  partitionImageFiles,
  type ProductFormState,
} from "@/lib/product-form";
import { cn } from "@/lib/utils";

const INITIAL_STATE: ProductFormState = {
  error: null,
  fieldErrors: {},
  values: {
    brand: "",
    name: "",
    category: "",
    size: "",
    condition: "",
    price: "",
    cost: "",
    description: "",
    authenticityNotes: "",
  },
};

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, INITIAL_STATE);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function syncFileInput(next: ImageItem[]) {
    const dataTransfer = new DataTransfer();
    next.forEach((item) => dataTransfer.items.add(item.file));
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }
  }

  function addFiles(incoming: FileList | File[]) {
    const { accepted, rejected } = partitionImageFiles(images.length, Array.from(incoming));

    setImageError(rejected.length > 0 ? rejected.map((r) => `${r.name}: ${r.reason}`).join(" · ") : null);

    if (accepted.length === 0) return;

    const newItems: ImageItem[] = accepted.map((file) => ({
      id: `${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => {
      const next = [...prev, ...newItems];
      syncFileInput(next);
      return next;
    });
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((item) => item.id !== id);
      syncFileInput(next);
      return next;
    });
  }

  function moveImage(id: string, direction: -1 | 1) {
    setImages((prev) => {
      const index = prev.findIndex((item) => item.id === id);
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

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-sm font-medium tracking-[0.15em] text-foreground uppercase">
          Nuovo prodotto
        </h1>
        <p className="text-xs text-muted-foreground">Aggiungi un pezzo unico al catalogo.</p>
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

          {combinedImageError && (
            <p role="alert" className="text-[0.7rem] text-destructive">
              {combinedImageError}
            </p>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((item, index) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />

                  {index === 0 && (
                    <span className="absolute top-1 left-1 bg-background/90 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-[0.1em] text-foreground uppercase">
                      Principale
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    aria-label="Rimuovi immagine"
                    className="absolute top-1 right-1 flex size-6 items-center justify-center bg-background/90 text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>

                  <div className="absolute bottom-1 left-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(item.id, -1)}
                      disabled={index === 0}
                      aria-label="Sposta prima"
                      className="flex size-6 items-center justify-center bg-background/90 text-foreground disabled:opacity-30"
                    >
                      <CaretLeftIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(item.id, 1)}
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
        {pending ? "Salvataggio in corso…" : "Salva prodotto"}
      </Button>
    </form>
  );
}
