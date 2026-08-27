"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  MAX_IMAGE_FILES,
  readProductFormValues,
  validateImageFile,
  validateProductFields,
  type ProductFormState,
} from "@/lib/product-form";
import {
  removeStorageFiles,
  removeUnreferencedStorageFiles,
  uploadProductImages,
} from "@/lib/actions/product-images";

const GENERIC_ERROR = "Si è verificato un errore. Riprova.";

// Describes the final image order submitted by the edit form: each entry is
// either a kept existing image (by id) or a slot for one of the newly
// uploaded files, taken in the same order they appear in the "images" file
// input. This is how a single mixed list of existing + new images (with
// arbitrary reordering and removals) crosses the form boundary as plain
// FormData.
type ImageOrderMarker = { type: "existing"; id: string } | { type: "new" };

function parseImageOrder(raw: FormDataEntryValue | null): ImageOrderMarker[] | null {
  if (typeof raw !== "string" || !raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    for (const entry of parsed) {
      const isExisting =
        entry && typeof entry === "object" && entry.type === "existing" && typeof entry.id === "string";
      const isNew = entry && typeof entry === "object" && entry.type === "new";
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

  const newFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const order = parseImageOrder(formData.get("imageOrder"));

  if (!order) {
    return {
      error: "Errore nel salvataggio delle immagini. Ricarica la pagina e riprova.",
      fieldErrors: {},
      values,
    };
  }

  const newMarkerCount = order.filter((marker) => marker.type === "new").length;

  if (newMarkerCount !== newFiles.length) {
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
  } else {
    for (const file of newFiles) {
      const error = validateImageFile(file);
      if (error) {
        fieldErrors.images = error;
        break;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Controlla i campi evidenziati.", fieldErrors, values };
  }

  const admin = createAdminClient();

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
    newFiles.length === 0 &&
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

  const uploadResult = await uploadProductImages(admin, newFiles, product.slug);

  if (!uploadResult.ok) {
    return { error: uploadResult.error, fieldErrors: {}, values };
  }

  const uploadedPaths = [...uploadResult.paths];

  const finalRows = order.map((marker, position) => ({
    product_id: productId,
    storage_path: marker.type === "existing" ? storagePathById.get(marker.id)! : uploadedPaths.shift()!,
    position,
  }));

  // Existing rows are dropped and reinserted (rather than updated in place)
  // so reordering never has to pass through an intermediate state where two
  // rows momentarily share a (product_id, position) pair.
  const { error: deleteError } = await admin.from("product_images").delete().eq("product_id", productId);

  if (deleteError) {
    console.error("updateProduct: product_images delete failed", productId, deleteError);
    await removeStorageFiles(admin, uploadResult.paths);
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
