"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import {
  MAX_IMAGE_FILES,
  readProductFormValues,
  validateImageFile,
  validateProductFields,
  type ProductFormState,
} from "@/lib/product-form";
import { removeStorageFiles, uploadProductImages } from "@/lib/actions/product-images";

export type CreateProductState = ProductFormState;

const GENERIC_ERROR = "Si è verificato un errore. Riprova.";

export async function createProduct(
  _prevState: CreateProductState,
  formData: FormData
): Promise<CreateProductState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const values = readProductFormValues(formData);

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo.", fieldErrors: {}, values };
  }

  const { fieldErrors, price, cost } = validateProductFields(values);

  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    fieldErrors.images = "Carica almeno un'immagine.";
  } else if (files.length > MAX_IMAGE_FILES) {
    fieldErrors.images = `Massimo ${MAX_IMAGE_FILES} immagini.`;
  } else {
    for (const file of files) {
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

  // Generate a unique slug from brand + name, appending a short random
  // suffix on collision rather than failing the submission.
  const base = slugify(`${values.brand} ${values.name}`) || "prodotto";
  let slug = base;
  let slugIsUnique = false;

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: existing, error: lookupError } = await admin
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (lookupError) {
      return { error: GENERIC_ERROR, fieldErrors: {}, values };
    }

    if (!existing) {
      slugIsUnique = true;
      break;
    }

    slug = `${base}-${randomBytes(3).toString("hex")}`;
  }

  if (!slugIsUnique) {
    return { error: "Impossibile generare uno slug univoco. Riprova.", fieldErrors: {}, values };
  }

  // Upload images before touching the products table, so a public
  // "available" listing never exists without its images.
  const uploadResult = await uploadProductImages(admin, files, slug);

  if (!uploadResult.ok) {
    return { error: uploadResult.error, fieldErrors: {}, values };
  }

  const uploadedPaths = uploadResult.paths;

  const { data: product, error: insertError } = await admin
    .from("products")
    .insert({
      slug,
      brand: values.brand,
      name: values.name,
      category: values.category,
      size: values.size,
      condition: values.condition,
      price,
      cost,
      description: values.description || null,
      authenticity_notes: values.authenticityNotes || null,
      status: "available",
    })
    .select("id")
    .single();

  if (insertError || !product) {
    console.error("createProduct: product insert failed", insertError);
    await removeStorageFiles(admin, uploadedPaths);
    return { error: "Salvataggio del prodotto non riuscito. Riprova.", fieldErrors: {}, values };
  }

  const { error: imagesError } = await admin.from("product_images").insert(
    uploadedPaths.map((storage_path, position) => ({
      product_id: product.id,
      storage_path,
      position,
    }))
  );

  if (imagesError) {
    console.error("createProduct: product_images insert failed", imagesError);
    await removeStorageFiles(admin, uploadedPaths);
    await admin.from("products").delete().eq("id", product.id);
    return { error: "Salvataggio delle immagini non riuscito. Riprova.", fieldErrors: {}, values };
  }

  redirect(`/prodotto/${slug}`);
}
