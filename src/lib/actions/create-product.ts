"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { after } from "next/server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import {
  EMPTY_PRODUCT_FORM_VALUES,
  MAX_IMAGE_FILES,
  MAX_SIZES_PER_SUBMISSION,
  buildSizeVariants,
  parseImagePaths,
  readProductFormValues,
  readSelectedSizes,
  sizeImagesFieldName,
  validateProductFields,
  type ProductFormState,
  type SizeVariant,
} from "@/lib/product-form";
import { isSizeInScale } from "@/lib/product-sizes";
import { cleanupOrphanUploads, verifyUploadedImages } from "@/lib/actions/product-images";

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

// Best-effort undo of a partially committed submission, logged rather than
// surfaced: the caller is already reporting a failure to the admin.
//
// Deliberately leaves the storage objects alone. The admin's next move is to
// press save again, and the form still holds the paths of photos it already
// uploaded — deleting them here would turn a retryable failure into "ricarica
// la pagina e riprova" with every photo picked again. Rolling back the rows is
// enough to make those paths unreferenced, so the retry re-attaches them, and
// cleanupOrphanUploads collects them if the admin gives up instead.
async function rollback(admin: AdminClient, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;

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
  // `size` field is the edit form's shape and is not used here. Measurements
  // are likewise per-size and are parsed by buildSizeVariants below.
  const { fieldErrors, price, cost, weightGrams, lengthCm, widthCm, heightCm } =
    validateProductFields(values, { requireSize: false, requireMeasurements: false });

  const sizes = readSelectedSizes(formData);

  if (sizes.length === 0) {
    fieldErrors.sizes = "Seleziona almeno una taglia.";
  } else if (sizes.length > MAX_SIZES_PER_SUBMISSION) {
    fieldErrors.sizes = `Massimo ${MAX_SIZES_PER_SUBMISSION} taglie per prodotto.`;
  } else if (!fieldErrors.category && !fieldErrors.gender) {
    // Only meaningful once the gender+category pair is known — the scale that
    // pair selects is what defines which sizes exist at all.
    const unknown = sizes.filter((size) => !isSizeInScale(values.gender, values.category, size));
    if (unknown.length > 0) {
      fieldErrors.sizes = `Taglie non valide per questa categoria: ${unknown.join(", ")}.`;
    }
  }

  // The browser has already compressed these and uploaded them straight to
  // Storage, so what arrives here is a list of storage paths, not files.
  // parseImagePaths rejects anything that is not a path this server minted.
  const sharedPaths = parseImagePaths(formData.get("images"));

  if (sharedPaths === null) {
    fieldErrors.images = "Errore nel caricamento delle immagini. Ricarica la pagina e riprova.";
  } else if (sharedPaths.length === 0) {
    fieldErrors.images = "Carica almeno un'immagine.";
  } else if (sharedPaths.length > MAX_IMAGE_FILES) {
    fieldErrors.images = `Massimo ${MAX_IMAGE_FILES} immagini.`;
  }

  // A size's own photos. Present only when that piece differs from its
  // siblings — a flaw, different wear — in which case they REPLACE the shared
  // set for that row rather than trailing it: a shoot of a different garment
  // has no business padding out the photos of this one. Left empty, the size
  // shows the shared set, exactly like the description override.
  const ownPathsBySize = new Map<string, string[]>();

  if (!fieldErrors.sizes && !fieldErrors.images && sharedPaths) {
    for (const size of sizes) {
      const ownPaths = parseImagePaths(formData.get(sizeImagesFieldName(size)));

      if (ownPaths === null) {
        fieldErrors.sizes = `Taglia ${size} — errore nel caricamento delle immagini. Ricarica la pagina e riprova.`;
        break;
      }

      if (ownPaths.length === 0) continue;

      // The cap is on this size's own set alone, since it is the whole set
      // that row will carry.
      if (ownPaths.length > MAX_IMAGE_FILES) {
        fieldErrors.sizes = `Taglia ${size} — massimo ${MAX_IMAGE_FILES} immagini.`;
        break;
      }

      ownPathsBySize.set(size, ownPaths);
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Controlla i campi evidenziati.", fieldErrors, values };
  }

  // Narrowing only: a null sharedPaths always set fieldErrors.images above, so
  // this is unreachable in practice.
  if (!sharedPaths) {
    return { error: GENERIC_ERROR, fieldErrors: {}, values };
  }

  const variantsResult = buildSizeVariants(
    formData,
    sizes,
    {
      price,
      condition: values.condition,
      description: values.description || null,
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
    },
    values.category
  );

  if (!variantsResult.ok) {
    return {
      error: "Controlla i campi evidenziati.",
      fieldErrors: { sizes: variantsResult.error },
      values,
    };
  }

  const variants: SizeVariant[] = variantsResult.variants;

  const admin = createAdminClient();

  // Housekeeping for upload slots that were written to but never attached to a
  // product. Scheduled with `after` so it runs once the response is already
  // out — it must never sit between the admin pressing save and the save
  // completing. See cleanupOrphanUploads for how it stays bounded.
  after(() => cleanupOrphanUploads(admin));

  const slugResult = await generateSlugs(admin, values.brand, values.name, sizes);

  if (!slugResult.ok) {
    return { error: slugResult.error, fieldErrors: {}, values };
  }

  // Every storage object this submission claims, shared and per-size alike.
  //
  // The shared set is uploaded once for the whole submission: every size of a
  // piece is photographed once, and each product row that did not override it
  // gets its own product_images rows pointing at these same storage paths. It
  // is verified either way — a size overriding it doesn't make the object any
  // less something the browser just wrote.
  const submittedPaths = [...sharedPaths, ...[...ownPathsBySize.values()].flat()];

  // Each picker rejects duplicates within itself; this catches a path reused
  // across two pickers, which would attach one object to two positions and make
  // deleting either one break the other.
  if (new Set(submittedPaths).size !== submittedPaths.length) {
    return {
      error: "Errore nel caricamento delle immagini. Ricarica la pagina e riprova.",
      fieldErrors: {},
      values,
    };
  }

  // The bytes never passed through this action, so this is where the objects
  // the browser wrote get checked: present, acceptable stored type and size,
  // and not already attached to another product.
  const verification = await verifyUploadedImages(admin, submittedPaths);

  if (!verification.ok) {
    return { error: verification.error, fieldErrors: {}, values };
  }

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
        gender: values.gender,
        category: values.category,
        size: variant.size,
        condition: variant.condition,
        price: variant.price,
        cost,
        // Shared by the whole size run: composition is a property of the
        // garment. Measurements are not — a 30 and a 34 of the same jeans
        // have different waists, so each row carries its own.
        composition: values.composition || null,
        measurements: variant.measurements,
        // Per-size when that size overrode it: two pieces of the same run can
        // differ physically, and the one with a flaw needs to say so.
        description: variant.description,
        authenticity_notes: values.authenticityNotes || null,
        weight_grams: variant.weightGrams,
        length_cm: variant.lengthCm,
        width_cm: variant.widthCm,
        height_cm: variant.heightCm,
        status: "available",
      }))
    )
    .select("id, size")
    .returns<{ id: string; size: string }[]>();

  if (insertError || !inserted || inserted.length !== variants.length) {
    console.error("createProduct: product insert failed", insertError);
    await rollback(admin, (inserted ?? []).map((row) => row.id));
    return { error: "Salvataggio del prodotto non riuscito. Riprova.", fieldErrors: {}, values };
  }

  const productIds = inserted.map((row) => row.id);

  // Matched on size rather than on the order the insert happened to return
  // rows in: which row gets which extra photos has to be exact.
  const productIdBySize = new Map(inserted.map((row) => [row.size, row.id]));

  if (variants.some((variant) => !productIdBySize.has(variant.size))) {
    console.error("createProduct: inserted rows do not cover every size", productIds);
    await rollback(admin, productIds);
    return { error: "Salvataggio del prodotto non riuscito. Riprova.", fieldErrors: {}, values };
  }

  const { error: imagesError } = await admin.from("product_images").insert(
    variants.flatMap((variant) => {
      const productId = productIdBySize.get(variant.size)!;
      // A size's own photos replace the shared set rather than trailing it:
      // they exist precisely because this piece differs from its siblings, and
      // a shoot documenting a different garment must not follow them. No own
      // photos means the shared set, unchanged.
      const ownPaths = ownPathsBySize.get(variant.size);
      const paths = ownPaths && ownPaths.length > 0 ? ownPaths : sharedPaths;

      return paths.map((storage_path, position) => ({
        product_id: productId,
        storage_path,
        position,
      }));
    })
  );

  if (imagesError) {
    console.error("createProduct: product_images insert failed", imagesError);
    await rollback(admin, productIds);
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
