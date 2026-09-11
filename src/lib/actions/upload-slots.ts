"use server";

import { randomUUID } from "node:crypto";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  MAX_IMAGE_FILES,
  PRODUCT_IMAGES_BUCKET,
  UPLOAD_PATH_PREFIX,
  imageExtensionForMimeType,
  isAllowedImageMimeType,
} from "@/lib/product-form";

export type UploadSlot = { path: string; token: string };

export type CreateUploadSlotsResult =
  | { ok: true; slots: UploadSlot[] }
  | { ok: false; error: string };

// Mints one signed upload URL per image the browser is about to send.
//
// The path is chosen HERE, never by the client: a random UUID under uploads/,
// with the extension derived from a content type checked against the allowlist.
// A signed URL only authorises writing to its own path, so the browser can put
// bytes exactly where this action told it to and nowhere else — it cannot
// overwrite an existing product image, and it cannot pick a path that would
// collide with another submission.
//
// Takes the content types rather than a separate count so the two can never
// disagree; the count cap is applied to the array length.
export async function createUploadSlots(
  contentTypes: string[]
): Promise<CreateUploadSlotsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
    return { ok: false, error: "Nessuna immagine da caricare." };
  }

  if (contentTypes.length > MAX_IMAGE_FILES) {
    return { ok: false, error: `Massimo ${MAX_IMAGE_FILES} immagini.` };
  }

  if (!contentTypes.every(isAllowedImageMimeType)) {
    return { ok: false, error: "Formato non supportato. Usa JPEG, PNG o WEBP." };
  }

  const admin = createAdminClient();
  const slots: UploadSlot[] = [];

  for (const contentType of contentTypes) {
    const path = `${UPLOAD_PATH_PREFIX}/${randomUUID()}.${imageExtensionForMimeType(contentType)}`;

    const { data, error } = await admin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("createUploadSlots: failed to sign upload url", path, error);
      return { ok: false, error: "Preparazione del caricamento non riuscita. Riprova." };
    }

    slots.push({ path: data.path, token: data.token });
  }

  return { ok: true, slots };
}
