import "server-only";

import type { createAdminClient } from "@/lib/supabase/server";
import {
  MAX_IMAGE_SIZE_BYTES,
  PRODUCT_IMAGES_BUCKET,
  UPLOAD_PATH_PATTERN,
  UPLOAD_PATH_PREFIX,
  isAllowedImageMimeType,
} from "@/lib/product-form";

type AdminClient = ReturnType<typeof createAdminClient>;

// Best-effort storage cleanup — used both to roll back a partially failed
// submission and to remove files for images a user deleted. Failures are
// logged rather than thrown: a dangling storage blob is a minor cost,
// nowhere near as bad as failing the mutation that already succeeded in the
// database.
export async function removeStorageFiles(admin: AdminClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) {
    console.error("removeStorageFiles: failed to remove storage files", paths, error);
  }
}

// Storage files are shared between the sizes of a size run — createProduct
// points every product row in the group at the same storage_path. So "this
// product no longer shows image X" does not mean "delete X": a sibling size may
// still be showing it. Deletes only the paths no product_images row references
// any more, and errs towards keeping the file when the check itself fails.
export async function removeUnreferencedStorageFiles(
  admin: AdminClient,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;

  const { data, error } = await admin
    .from("product_images")
    .select("storage_path")
    .in("storage_path", paths)
    .returns<{ storage_path: string }[]>();

  if (error) {
    console.error("removeUnreferencedStorageFiles: reference check failed", paths, error);
    return;
  }

  const stillReferenced = new Set((data ?? []).map((row) => row.storage_path));
  await removeStorageFiles(
    admin,
    paths.filter((path) => !stillReferenced.has(path))
  );
}

export type VerifyUploadedImagesResult = { ok: true } | { ok: false; error: string };

const IMAGES_GONE_ERROR = "Immagini non trovate. Ricarica la pagina e riprova.";

// The bytes were uploaded by the browser straight to Storage, so the action
// never saw them. This is where they get checked: that each path is one we
// minted, that an object actually exists there, that its real stored type and
// size are acceptable, and that it is not already attached to another product.
//
// Nothing here trusts the client. The size and content type come from Storage's
// own record of the object, not from anything the form said.
export async function verifyUploadedImages(
  admin: AdminClient,
  paths: string[]
): Promise<VerifyUploadedImagesResult> {
  if (paths.length === 0) return { ok: true };

  for (const path of paths) {
    if (!UPLOAD_PATH_PATTERN.test(path)) {
      console.error("verifyUploadedImages: rejected malformed path", path);
      return { ok: false, error: IMAGES_GONE_ERROR };
    }
  }

  // A path already referenced by product_images belongs to a product that has
  // been saved. Reusing it here would let a replayed submission adopt another
  // product's photo, and a later delete on either side would break the other.
  const { data: alreadyUsed, error: referenceError } = await admin
    .from("product_images")
    .select("storage_path")
    .in("storage_path", paths)
    .returns<{ storage_path: string }[]>();

  if (referenceError) {
    console.error("verifyUploadedImages: reference check failed", referenceError);
    return { ok: false, error: IMAGES_GONE_ERROR };
  }

  if ((alreadyUsed ?? []).length > 0) {
    console.error(
      "verifyUploadedImages: paths already attached to a product",
      (alreadyUsed ?? []).map((row) => row.storage_path)
    );
    return { ok: false, error: IMAGES_GONE_ERROR };
  }

  for (const path of paths) {
    const { data, error } = await admin.storage.from(PRODUCT_IMAGES_BUCKET).info(path);

    if (error || !data) {
      console.error("verifyUploadedImages: object not found", path, error);
      return { ok: false, error: IMAGES_GONE_ERROR };
    }

    if (!data.contentType || !isAllowedImageMimeType(data.contentType)) {
      console.error("verifyUploadedImages: unexpected content type", path, data.contentType);
      return { ok: false, error: "Formato immagine non supportato. Usa JPEG, PNG o WEBP." };
    }

    if (typeof data.size === "number" && data.size > MAX_IMAGE_SIZE_BYTES) {
      console.error("verifyUploadedImages: object too large", path, data.size);
      return { ok: false, error: "Immagine troppo grande. Riprova." };
    }
  }

  return { ok: true };
}

// One page, never a loop. storage.list is paginated and the uploads/ prefix
// only grows, so an unbounded sweep would get slower with every product ever
// created.
const ORPHAN_SWEEP_PAGE_SIZE = 100;

// An upload slot is minted the moment a photo is picked and may sit unattached
// for as long as the admin takes to fill in the rest of the form. Only objects
// well past any plausible editing session are candidates.
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Housekeeping for upload slots that were written to but never attached to a
// product — the admin picked a photo, changed their mind, removed it.
//
// This must never delay or break a save, so it is scheduled with `after()` by
// its callers and runs once the response is already out. It is bounded to a
// single page, sorted oldest-first so a backlog drains a page per save instead
// of the scan re-reading the newest objects forever. Errors are logged and
// swallowed, like the other cleanup in this file.
export async function cleanupOrphanUploads(admin: AdminClient): Promise<void> {
  try {
    const { data, error } = await admin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .list(UPLOAD_PATH_PREFIX, {
        limit: ORPHAN_SWEEP_PAGE_SIZE,
        sortBy: { column: "created_at", order: "asc" },
      });

    if (error || !data) {
      console.error("cleanupOrphanUploads: list failed", error);
      return;
    }

    const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;
    const candidates = data
      .filter((object) => {
        if (!object.name || !object.created_at) return false;
        const createdAt = Date.parse(object.created_at);
        return Number.isFinite(createdAt) && createdAt < cutoff;
      })
      .map((object) => `${UPLOAD_PATH_PREFIX}/${object.name}`);

    if (candidates.length === 0) return;

    // Reuses the reference check, so an object a product still points at is
    // kept even if it somehow ended up looking like an orphan.
    await removeUnreferencedStorageFiles(admin, candidates);
  } catch (error) {
    console.error("cleanupOrphanUploads: sweep failed", error);
  }
}
