"use server";

import { randomBytes, randomUUID } from "node:crypto";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import {
  EMPTY_PRODUCT_FORM_VALUES,
  MAX_IMAGE_FILES,
  MAX_SIZES_PER_SUBMISSION,
  buildSizeVariants,
  readProductFormValues,
  readSelectedSizes,
  validateImageFile,
  validateProductFields,
  type ProductFormState,
  type SizeVariant,
} from "@/lib/product-form";
import { isSizeInScale } from "@/lib/product-sizes";
import { removeStorageFiles, uploadProductImages } from "@/lib/actions/product-images";

// A fresh, non-empty successToken on a returned state is what tells
// NewProductForm a submission just succeeded — it's used as a remount key to
// reset the (otherwise uncontrolled) form fields and image picker, so it must
// be unique per successful submission rather than a plain boolean.
export type CreateProductState = ProductFormState & { successToken?: string };

const GENERIC_ERROR = "Si è verificato un errore. Riprova.";

type AdminClient = ReturnType<typeof createAdminClient>;

// Generates a slug per size, unique both against what's already in the table
// and against the other sizes of this same submission (which aren't committed
// yet, so a database lookup can't see them). Size is part of the base rather
// than an afterthought: /prodotto/levis-501-32 reads better than a random
// suffix, and only genuinely colliding slugs get one.
async function generateSlugs(
  admin: AdminClient,
  brand: string,
  name: string,
  sizes: string[]
): Promise<{ ok: true; slugs: Map<string, string> } | { ok: false; error: string }> {
  const slugs = new Map<string, string>();
  const taken = new Set<string>();

  for (const size of sizes) {
    const base = slugify(`${brand} ${name} ${size}`) || "prodotto";
    let slug = base;
    let slugIsUnique = false;

    for (let attempt = 0; attempt < 6; attempt++) {
      if (taken.has(slug)) {
        slug = `${base}-${randomBytes(3).toString("hex")}`;
        continue;
      }

      const { data: existing, error: lookupError } = await admin
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (lookupError) {
        return { ok: false, error: GENERIC_ERROR };
      }

      if (!existing) {
        slugIsUnique = true;
        break;
      }

      slug = `${base}-${randomBytes(3).toString("hex")}`;
    }

    if (!slugIsUnique) {
      return { ok: false, error: "Impossibile generare uno slug univoco. Riprova." };
    }

    taken.add(slug);
    slugs.set(size, slug);
  }

  return { ok: true, slugs };
}

// Best-effort undo of a partially committed submission. Rows first, storage
// last, and each step logged rather than surfaced: the caller is already
// reporting a failure to the admin, who will simply retry.
async function rollback(admin: AdminClient, productIds: string[], paths: string[]): Promise<void> {
  if (productIds.length > 0) {
    const { error: imagesError } = await admin
      .from("product_images")
      .delete()
      .in("product_id", productIds);
    if (imagesError) {
      console.error("createProduct: rollback of product_images failed", productIds, imagesError);
    }

    const { error: productsError } = await admin.from("products").delete().in("id", productIds);
    if (productsError) {
      console.error("createProduct: rollback of products failed", productIds, productsError);
    }
  }

  await removeStorageFiles(admin, paths);
}

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

  // The create form submits one `sizes` entry per selected size — the single
  // `size` field is the edit form's shape and is not used here.
  const { fieldErrors, price, cost, weightGrams, lengthCm, widthCm, heightCm } =
    validateProductFields(values, { requireSize: false });

  const sizes = readSelectedSizes(formData);

  if (sizes.length === 0) {
    fieldErrors.sizes = "Seleziona almeno una taglia.";
  } else if (sizes.length > MAX_SIZES_PER_SUBMISSION) {
    fieldErrors.sizes = `Massimo ${MAX_SIZES_PER_SUBMISSION} taglie per prodotto.`;
  } else if (!fieldErrors.category) {
    // Only meaningful once the category is known — the scale is what defines
    // which sizes exist at all.
    const unknown = sizes.filter((size) => !isSizeInScale(values.category, size));
    if (unknown.length > 0) {
      fieldErrors.sizes = `Taglie non valide per questa categoria: ${unknown.join(", ")}.`;
    }
  }

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

  const variantsResult = buildSizeVariants(formData, sizes, {
    price,
    condition: values.condition,
    weightGrams,
    lengthCm,
    widthCm,
    heightCm,
  });

  if (!variantsResult.ok) {
    return {
      error: "Controlla i campi evidenziati.",
      fieldErrors: { sizes: variantsResult.error },
      values,
    };
  }

  const variants: SizeVariant[] = variantsResult.variants;

  const admin = createAdminClient();

  const slugResult = await generateSlugs(admin, values.brand, values.name, sizes);

  if (!slugResult.ok) {
    return { error: slugResult.error, fieldErrors: {}, values };
  }

  // Upload images before touching the products table, so a public
  // "available" listing never exists without its images. Uploaded once for
  // the whole submission: every size of a piece is photographed once, and
  // each product row gets its own product_images rows pointing at these same
  // storage paths.
  const storagePrefix = slugify(`${values.brand} ${values.name}`) || "prodotto";
  const uploadResult = await uploadProductImages(admin, files, storagePrefix);

  if (!uploadResult.ok) {
    return { error: uploadResult.error, fieldErrors: {}, values };
  }

  const uploadedPaths = uploadResult.paths;

  // A single size stays exactly what it was before size runs existed: an
  // ungrouped one-off piece, rendered by the product page without a size
  // selector.
  const groupId = variants.length > 1 ? randomUUID() : null;

  const { data: inserted, error: insertError } = await admin
    .from("products")
    .insert(
      variants.map((variant) => ({
        slug: slugResult.slugs.get(variant.size)!,
        group_id: groupId,
        brand: values.brand,
        name: values.name,
        category: values.category,
        size: variant.size,
        condition: variant.condition,
        price: variant.price,
        cost,
        description: values.description || null,
        authenticity_notes: values.authenticityNotes || null,
        weight_grams: variant.weightGrams,
        length_cm: variant.lengthCm,
        width_cm: variant.widthCm,
        height_cm: variant.heightCm,
        status: "available",
      }))
    )
    .select("id");

  if (insertError || !inserted || inserted.length !== variants.length) {
    console.error("createProduct: product insert failed", insertError);
    await rollback(admin, (inserted ?? []).map((row) => row.id), uploadedPaths);
    return { error: "Salvataggio del prodotto non riuscito. Riprova.", fieldErrors: {}, values };
  }

  const productIds = inserted.map((row) => row.id);

  const { error: imagesError } = await admin.from("product_images").insert(
    productIds.flatMap((productId) =>
      uploadedPaths.map((storage_path, position) => ({
        product_id: productId,
        storage_path,
        position,
      }))
    )
  );

  if (imagesError) {
    console.error("createProduct: product_images insert failed", imagesError);
    await rollback(admin, productIds, uploadedPaths);
    return { error: "Salvataggio delle immagini non riuscito. Riprova.", fieldErrors: {}, values };
  }

  // Stay on the same page instead of redirecting to the new product, so an
  // admin adding several pieces in a row doesn't have to navigate back each
  // time — the form resets itself in response to a fresh successToken.
  return {
    error: null,
    fieldErrors: {},
    values: EMPTY_PRODUCT_FORM_VALUES,
    successToken: randomUUID(),
  };
}
