"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CircleNotchIcon,
  UploadSimpleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Label } from "@/components/ui/label";
import { useUploadTracker } from "@/components/admin/upload-tracker";
import { uploadImageFiles, type UploadOutcome } from "@/lib/admin/upload-image";
import {
  MAX_IMAGE_FILES,
  MAX_SOURCE_IMAGE_SIZE_BYTES,
  formatFileSize,
  partitionImageFiles,
} from "@/lib/product-form";
import { cn } from "@/lib/utils";

type ImageItem = {
  id: string;
  // The original picked file, kept so a failed upload can be retried without
  // making the admin find the photo again — the common case is a phone losing
  // signal mid-upload, where retrying is the only thing they want to do.
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "failed";
  path?: string;
  error?: string;
};

type ImagePickerProps = {
  // The hidden input's name — "images" for the shared set, or a per-size name
  // (see sizeImagesFieldName) for the extras of one size.
  name: string;
  label: string;
  pending: boolean;
  serverError?: string;
  // Shown under the label, before the drop zone.
  description?: ReactNode;
};

// Owns its own image state so it can be reset by remounting it (via a `key`
// tied to a successful submission) instead of imperatively clearing state
// from an effect.
//
// Photos are compressed and uploaded to Storage as soon as they are picked,
// not on submit: the upload runs while the admin fills in the rest of the form,
// which is what makes adding a product from a phone tolerable. The form then
// submits storage paths, never bytes. See src/lib/admin/upload-image.ts — the
// same sequence backs the picker built into EditProductForm.
export function ImagePicker({
  name,
  label,
  pending,
  serverError,
  description,
}: ImagePickerProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickerId = useId();
  const { setPickerBusy } = useUploadTracker();

  // Anything not finished blocks submit — an upload still running would be
  // saved without that photo, and a failed one needs the admin to retry or
  // remove it rather than silently vanish from the product.
  const busy = images.some((item) => item.status !== "done");

  useEffect(() => {
    setPickerBusy(pickerId, busy);
  }, [pickerId, busy, setPickerBusy]);

  // The tracker keys on a picker id, so a picker that unmounts (a size being
  // deselected mid-upload) must not leave the form blocked forever.
  useEffect(() => {
    return () => setPickerBusy(pickerId, false);
  }, [pickerId, setPickerBusy]);

  function applyOutcomes(ids: string[], outcomes: UploadOutcome[]) {
    setImages((prev) =>
      prev.map((item) => {
        const index = ids.indexOf(item.id);
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
        bytes: images.reduce((total, item) => total + item.file.size, 0),
      },
      Array.from(incoming)
    );

    setImageError(
      rejected.length > 0 ? rejected.map((r) => `${r.name}: ${r.reason}`).join(" · ") : null
    );

    if (accepted.length === 0) return;

    const newItems: ImageItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));

    setImages((prev) => [...prev, ...newItems]);

    const outcomes = await uploadImageFiles(accepted);
    // Anything the admin removed while this was in flight is simply not in
    // state any more; its storage object is collected by cleanupOrphanUploads.
    applyOutcomes(
      newItems.map((item) => item.id),
      outcomes
    );
  }

  async function retryImage(id: string) {
    const target = images.find((item) => item.id === id);
    if (!target) return;

    setImages((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "uploading" as const, error: undefined } : item
      )
    );

    const outcomes = await uploadImageFiles([target.file]);
    applyOutcomes([id], outcomes);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function moveImage(id: string, direction: -1 | 1) {
    setImages((prev) => {
      const index = prev.findIndex((item) => item.id === id);
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

  const uploadingCount = images.filter((item) => item.status === "uploading").length;
  const failedCount = images.filter((item) => item.status === "failed").length;

  const statusError =
    failedCount > 0
      ? `${failedCount} immagine/i non caricate. Riprova o rimuovile prima di salvare.`
      : null;

  const combinedImageError = serverError ?? imageError ?? statusError;

  // Only finished uploads are submitted. `busy` keeps the form from being sent
  // while that list is still incomplete.
  const uploadedPaths = images
    .filter((item): item is ImageItem & { path: string } => item.status === "done" && !!item.path)
    .map((item) => item.path);

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
          Max {MAX_IMAGE_FILES} · {formatFileSize(MAX_SOURCE_IMAGE_SIZE_BYTES)} ciascuna ·
          compresse automaticamente
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        // HEIC is offered deliberately: compressImageFile converts it where the
        // browser can decode it, and says so clearly where it cannot. Listing
        // it also stops iOS transcoding to a needlessly large JPEG first.
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          if (event.target.files?.length) void addFiles(event.target.files);
          // Lets the same file be picked again after being removed.
          event.target.value = "";
        }}
      />

      <input type="hidden" name={name} value={JSON.stringify(uploadedPaths)} readOnly />

      {uploadingCount > 0 && (
        <p role="status" className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
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
            <div key={item.id} className="relative aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt=""
                className={cn("h-full w-full object-cover", item.status !== "done" && "opacity-40")}
              />

              {item.status === "uploading" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <CircleNotchIcon className="size-5 animate-spin text-foreground" />
                </span>
              )}

              {item.status === "failed" && (
                <button
                  type="button"
                  onClick={() => void retryImage(item.id)}
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

              {/* Whatever set this picker holds is the whole set of its
                  product row — shared or per-size — so its first photo is the
                  one the catalog card and the checkout line item show. */}
              {index === 0 && (
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
