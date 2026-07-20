import "server-only";

import type { createAdminClient } from "@/lib/supabase/server";
import { imageExtensionForMimeType } from "@/lib/product-form";

const PRODUCT_IMAGES_BUCKET = "product-images";

// Best-effort storage cleanup — used both to roll back a partially failed
// upload batch and to remove files for images a user deleted. Failures are
// logged rather than thrown: a dangling storage blob is a minor cost,
// nowhere near as bad as failing the mutation that already succeeded in the
// database.
export async function removeStorageFiles(
  admin: ReturnType<typeof createAdminClient>,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) {
    console.error("removeStorageFiles: failed to remove storage files", paths, error);
  }
}

export type UploadProductImagesResult =
  | { ok: true; paths: string[] }
  | { ok: false; error: string };

// Uploads files under `${pathPrefix}-${timestamp}-${index}.${ext}`, rolling
// back any partial uploads on failure. Shared by createProduct and
// updateProduct (for the new files an edit submission adds).
export async function uploadProductImages(
  admin: ReturnType<typeof createAdminClient>,
  files: File[],
  pathPrefix: string
): Promise<UploadProductImagesResult> {
  const timestamp = Date.now();
  const uploadedPaths: string[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const ext = imageExtensionForMimeType(file.type);
    const path = `${pathPrefix}-${timestamp}-${index}.${ext}`;

    const { error: uploadError } = await admin.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

    if (uploadError) {
      console.error("uploadProductImages: image upload failed", path, uploadError);
      await removeStorageFiles(admin, uploadedPaths);
      return { ok: false, error: "Caricamento immagini non riuscito. Riprova." };
    }

    uploadedPaths.push(path);
  }

  return { ok: true, paths: uploadedPaths };
}
