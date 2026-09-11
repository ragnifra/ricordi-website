"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  MAX_IMAGE_FILES,
  UPLOAD_PATH_PATTERN,
  readProductFormValues,
  validateProductFields,
  type ProductFormState,
} from "@/lib/product-form";
import {
  cleanupOrphanUploads,
  removeUnreferencedStorageFiles,
  verifyUploadedImages,
} from "@/lib/actions/product-images";

const GENERIC_ERROR = "Si è verificato un errore. Riprova.";

// Describes the final image order submitted by the edit form: each entry is
// either a kept existing image (by id) or a newly uploaded one, carrying the
// storage path the browser wrote it to. This is how a single mixed list of
// existing + new images (with arbitrary reordering and removals) crosses the
// form boundary as plain FormData.
//
// The path rides in the marker rather than in a parallel file list, so the
// order and the uploads cannot get out of step with each other.
type ImageOrderMarker = { type: "existing"; id: string } | { type: "new"; path: string };

function parseImageOrder(raw: FormDataEntryValue | null): ImageOrderMarker[] | null {
  if (typeof raw !== "string" || !raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") return null;

      const isExisting = entry.type === "existing" && typeof entry.id === "string";
      // Same gate as parseImagePaths: only a path this server minted is
      // accepted back from a submission.
      const isNew =
        entry.type === "new" &&
        typeof entry.path === "string" &&
        UPLOAD_PATH_PATTERN.test(entry.path);

      if (!isExisting && !isNew) return null;
    }

    return parsed as ImageOrderMarker[];
  } catch {
    return null;
  }
}

type ExistingImageRow = { id: string; storage_path: string };

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const values = readProductFormValues(formData);

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo.", fieldErrors: {}, values };
  }

  const { fieldErrors, price, cost, weightGrams, lengthCm, widthCm, heightCm, measurements } =
    validateProductFields(values);

  const order = parseImageOrder(formData.get("imageOrder"));

  if (!order) {
    return {
      error: "Errore nel salvataggio delle immagini. Ricarica la pagina e riprova.",
      fieldErrors: {},
      values,
    };
  }

  const newPaths = order
    .filter((marker): marker is { type: "new"; path: string } => marker.type === "new")
    .map((marker) => marker.path);

  if (new Set(newPaths).size !== newPaths.length) {
    return {
      error: "Errore nel salvataggio delle immagini. Ricarica la pagina e riprova.",
      fieldErrors: {},
      values,
    };
  }

  if (order.length === 0) {
    fieldErrors.images = "Carica almeno un'immagine.";
  } else if (order.length > MAX_IMAGE_FILES) {
    fieldErrors.images = `Massimo ${MAX_IMAGE_FILES} immagini.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Controlla i campi evidenziati.", fieldErrors, values };
  }

  const admin = createAdminClient();

  // Off the critical path — see the same call in createProduct.
  after(() => cleanupOrphanUploads(admin));

  // The browser uploaded these straight to Storage, so verify the objects
  // before pointing a product row at them.
  const verification = await verifyUploadedImages(admin, newPaths);

  if (!verification.ok) {
    return { error: verification.error, fieldErrors: {}, values };
  }

  const { data: product, error: lookupError } = await admin
    .from("products")
    .select("slug, product_images(id, storage_path)")
    .eq("id", productId)
    .maybeSingle()
    .returns<{ slug: string; product_images: ExistingImageRow[] | null }>();

  if (lookupError) {
    console.error("updateProduct: product lookup failed", productId, lookupError);
    return { error: GENERIC_ERROR, fieldErrors: {}, values };
  }

  if (!product) {
    return { error: "Prodotto non trovato.", fieldErrors: {}, values };
  }

  const currentImages = product.product_images ?? [];
  const storagePathById = new Map(currentImages.map((image) => [image.id, image.storage_path]));

  for (const marker of order) {
    if (marker.type === "existing" && !storagePathById.has(marker.id)) {
      return { error: GENERIC_ERROR, fieldErrors: {}, values };
    }
  }

  const keptIds = new Set(order.filter((m): m is { type: "existing"; id: string } => m.type === "existing").map((m) => m.id));
  const removedPaths = currentImages
    .filter((image) => !keptIds.has(image.id))
    .map((image) => image.storage_path);

  const orderUnchanged =
    newPaths.length === 0 &&
    order.length === currentImages.length &&
    order.every((marker, index) => marker.type === "existing" && marker.id === currentImages[index]?.id);

  // Update the plain fields regardless of whether images changed.
  const { error: updateError } = await admin
    .from("products")
    .update({
      brand: values.brand,
      name: values.name,
      gender: values.gender,
      category: values.category,
      size: values.size,
      condition: values.condition,
      price,
      cost,
      composition: values.composition || null,
      measurements,
      description: values.description || null,
      authenticity_notes: values.authenticityNotes || null,
      weight_grams: weightGrams,
      length_cm: lengthCm,
      width_cm: widthCm,
      height_cm: heightCm,
    })
    .eq("id", productId);

  if (updateError) {
    console.error("updateProduct: product update failed", productId, updateError);
    return { error: GENERIC_ERROR, fieldErrors: {}, values };
  }

  if (orderUnchanged) {
    revalidatePath("/admin/prodotti");
    revalidatePath("/catalogo");
    revalidatePath(`/prodotto/${product.slug}`);
    redirect("/admin/prodotti");
  }

  const finalRows = order.map((marker, position) => ({
    product_id: productId,
    storage_path: marker.type === "existing" ? storagePathById.get(marker.id)! : marker.path,
    position,
  }));

  // Existing rows are dropped and reinserted (rather than updated in place)
  // so reordering never has to pass through an intermediate state where two
  // rows momentarily share a (product_id, position) pair.
  const { error: deleteError } = await admin.from("product_images").delete().eq("product_id", productId);

  if (deleteError) {
    console.error("updateProduct: product_images delete failed", productId, deleteError);
    // The newly uploaded objects are left in place on purpose — see the note on
    // rollback in create-product.ts. The form still holds their paths, so
    // pressing save again reuses them instead of re-uploading every photo.
    return { error: GENERIC_ERROR, fieldErrors: {}, values };
  }

  let { error: insertError } = await admin.from("product_images").insert(finalRows);

  if (insertError) {
    console.error("updateProduct: product_images insert failed, retrying once", productId, insertError);
    ({ error: insertError } = await admin.from("product_images").insert(finalRows));
  }

  if (insertError) {
    console.error(
      "updateProduct: product_images insert failed after retry — product has no images until fixed manually",
      productId,
      finalRows,
      insertError
    );
    return {
      error: "Le immagini non sono state salvate correttamente. Contatta l'assistenza tecnica.",
      fieldErrors: {},
      values,
    };
  }

  // Unreferenced only: images are shared across the sizes of a size run, so
  // removing one here must not pull the file out from under a sibling that
  // still shows it (see removeUnreferencedStorageFiles).
  await removeUnreferencedStorageFiles(admin, removedPaths);

  revalidatePath("/admin/prodotti");
  revalidatePath("/catalogo");
  revalidatePath(`/prodotto/${product.slug}`);

  redirect("/admin/prodotti");
}
