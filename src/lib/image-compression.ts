// Browser-side image compression, run before anything leaves the device.
//
// Two jobs. It shrinks a 3-5MB phone photo to a few hundred KB, which is what
// makes uploading a full product from a phone on mobile data bearable. And it
// normalises the format: whatever the picker hands us — HEIC from an iPhone, a
// PNG screenshot, a file with no MIME type at all — comes out as one of the two
// types the bucket accepts.
//
// Uses only platform APIs, no dependency. That has one consequence worth
// knowing: decoding HEIC relies on the browser, and only Safari can do it.
// Chrome and Firefox fail, which is what the "heic" failure reason is for.

// Longest edge of the stored image. Generous on purpose — see the note on
// IMAGE_QUALITY below.
export const MAX_IMAGE_DIMENSION = 2400;

// Deliberately higher than the ~0.82 you would normally reach for. These are
// one-of-a-kind resale pieces: the buyer judges condition from close-ups of
// flaws and wear, and compression artefacts in exactly those regions are what
// turn into disputes after a sale. The extra file weight costs nothing now that
// image bytes no longer pass through a serverless function.
//
// Do not lower this to "optimise" upload size. If artefacts still show on a
// flaw close-up, raise MAX_IMAGE_DIMENSION instead — resolution is the lever,
// quality is not.
export const IMAGE_QUALITY = 0.88;

export const HEIC_MESSAGE =
  "Le foto HEIC non sono supportate su questo browser. Aprile su iPhone e condividile come JPEG, oppure usa Safari.";

export type CompressionFailureReason = "heic" | "decode" | "encode";

export type CompressionResult =
  | { ok: true; file: File }
  | { ok: false; reason: CompressionFailureReason; message: string };

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

// iOS sometimes hands over a HEIC with an empty or generic MIME type, so the
// extension is checked too — this only decides which error message to show.
function looksLikeHeic(file: File): boolean {
  return HEIC_MIME_TYPES.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name);
}

// PNG and WEBP can carry transparency, and re-encoding those to JPEG would
// flatten it to black. Everything else (JPEG, HEIC, anything unrecognised the
// browser still managed to decode) becomes JPEG.
function outputTypeFor(file: File): "image/jpeg" | "image/webp" {
  const type = file.type.toLowerCase();
  return type === "image/png" || type === "image/webp" ? "image/webp" : "image/jpeg";
}

// Cosmetic only — the storage path is minted server-side and the extension
// there is what counts. This just keeps the File object self-consistent.
function renameFor(originalName: string, outputType: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "immagine";
  return `${base}.${outputType === "image/webp" ? "webp" : "jpg"}`;
}

export async function compressImageFile(file: File): Promise<CompressionResult> {
  let bitmap: ImageBitmap;

  try {
    // "from-image" bakes the EXIF orientation into the pixels. Without it a
    // photo taken sideways decodes upright here and then displays rotated,
    // because the re-encoded file no longer carries the EXIF tag that was
    // correcting it.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return looksLikeHeic(file)
      ? { ok: false, reason: "heic", message: HEIC_MESSAGE }
      : {
          ok: false,
          reason: "decode",
          message: `Impossibile leggere ${file.name}. Usa JPEG, PNG o WEBP.`,
        };
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return {
        ok: false,
        reason: "encode",
        message: `Impossibile elaborare ${file.name}. Riprova.`,
      };
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const outputType = outputTypeFor(file);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, IMAGE_QUALITY);
    });

    if (!blob) {
      return {
        ok: false,
        reason: "encode",
        message: `Impossibile elaborare ${file.name}. Riprova.`,
      };
    }

    return {
      ok: true,
      file: new File([blob], renameFor(file.name, outputType), { type: outputType }),
    };
  } finally {
    bitmap.close();
  }
}
