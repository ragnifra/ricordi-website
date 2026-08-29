"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Label } from "@/components/ui/label";
import {
  MAX_IMAGE_FILES,
  MAX_IMAGE_SIZE_BYTES,
  formatFileSize,
  partitionImageFiles,
} from "@/lib/product-form";
import { cn } from "@/lib/utils";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type ImagePickerProps = {
  // The file input's name — "images" for the shared set, or a per-size name
  // (see sizeImagesFieldName) for the extras of one size.
  name: string;
  label: string;
  pending: boolean;
  serverError?: string;
  // Shown under the label, before the drop zone.
  description?: ReactNode;
  // The first shared image is the product's main photo; a per-size extra
  // never is, since the shared set always comes first on the product row.
  showPrimaryBadge?: boolean;
};

// Owns its own image state so it can be reset by remounting it (via a `key`
// tied to a successful submission) instead of imperatively clearing state
// from an effect.
export function ImagePicker({
  name,
  label,
  pending,
  serverError,
  description,
  showPrimaryBadge = true,
}: ImagePickerProps) {
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

  const combinedImageError = serverError ?? imageError;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {description}

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
        <p className="text-[0.65rem] tracking-widest text-muted-foreground uppercase">
          JPEG, PNG o WEBP · max {MAX_IMAGE_FILES} · {formatFileSize(MAX_IMAGE_SIZE_BYTES)} ciascuna
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name={name}
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

              {showPrimaryBadge && index === 0 && (
                <span className="absolute top-1 left-1 bg-background/90 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-widest text-foreground uppercase">
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
  );
}
