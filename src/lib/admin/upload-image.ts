import { createUploadSlots } from "@/lib/actions/upload-slots";
import { compressImageFile } from "@/lib/image-compression";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/product-form";
import { createClient } from "@/lib/supabase/client";

export type UploadOutcome = { ok: true; path: string } | { ok: false; message: string };

const NETWORK_ERROR = "Caricamento non riuscito. Controlla la connessione e riprova.";

// Compresses a batch of picked files and uploads them straight to Supabase
// Storage, returning one outcome per input file, aligned by index.
//
// This is the whole reason large photos work at all now. The bytes go from the
// browser to Storage over a signed URL and never enter a server action, so the
// ~4.5MB request-body cap a serverless function is subject to simply does not
// apply. The action that follows carries only the resulting paths.
//
// Both admin image pickers call this. ImagePicker and EditProductForm keep
// their own item state (they display different things), but the compress → mint
// slot → upload sequence lives here once so a fix can never land in one of them
// and miss the other.
export async function uploadImageFiles(files: File[]): Promise<UploadOutcome[]> {
  const outcomes = new Array<UploadOutcome>(files.length);
  const ready: { index: number; file: File }[] = [];

  // Sequential: decoding a 12MP photo to a canvas is memory-hungry, and doing
  // ten at once is how a phone browser tab gets killed mid-upload.
  for (const [index, file] of files.entries()) {
    const result = await compressImageFile(file);
    if (result.ok) {
      ready.push({ index, file: result.file });
    } else {
      outcomes[index] = { ok: false, message: result.message };
    }
  }

  if (ready.length === 0) return outcomes;

  const slotResult = await createUploadSlots(ready.map((entry) => entry.file.type));

  if (!slotResult.ok) {
    for (const { index } of ready) {
      outcomes[index] = { ok: false, message: slotResult.error };
    }
    return outcomes;
  }

  const supabase = createClient();

  // Parallel here: this part is network-bound, and the batch is at most
  // MAX_IMAGE_FILES.
  await Promise.all(
    ready.map(async ({ index, file }, slotIndex) => {
      const slot = slotResult.slots[slotIndex];

      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .uploadToSignedUrl(slot.path, slot.token, file, {
          contentType: file.type,
          cacheControl: "31536000",
        });

      if (error) {
        console.error("uploadImageFiles: upload failed", slot.path, error);
        outcomes[index] = { ok: false, message: NETWORK_ERROR };
        return;
      }

      outcomes[index] = { ok: true, path: slot.path };
    })
  );

  return outcomes;
}
