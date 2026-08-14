"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { removeUnreferencedStorageFiles } from "@/lib/actions/product-images";

export type DeleteProductResult = {
  error: string | null;
};

type ProductForDeletion = {
  slug: string;
  product_images: { storage_path: string }[] | null;
};

export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo." };
  }

  const admin = createAdminClient();

  const { data: product, error: lookupError } = await admin
    .from("products")
    .select("slug, product_images(storage_path)")
    .eq("id", productId)
    .maybeSingle()
    .returns<ProductForDeletion>();

  if (lookupError) {
    console.error("deleteProduct: lookup failed", productId, lookupError);
    return { error: "Eliminazione non riuscita. Riprova." };
  }

  if (!product) {
    return { error: "Prodotto non trovato." };
  }

  const storagePaths = (product.product_images ?? []).map((image) => image.storage_path);

  // Row deletes before storage cleanup: if something fails partway, we'd
  // rather end up with orphaned storage files (harmless, logged) than a
  // product row that's gone from the DB but whose images still linger.
  const { error: imagesDeleteError } = await admin
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (imagesDeleteError) {
    console.error("deleteProduct: product_images delete failed", productId, imagesDeleteError);
    return { error: "Eliminazione non riuscita. Riprova." };
  }

  const { error: productDeleteError } = await admin.from("products").delete().eq("id", productId);

  if (productDeleteError) {
    console.error("deleteProduct: product delete failed", productId, productDeleteError);
    return { error: "Eliminazione non riuscita. Riprova." };
  }

  // Unreferenced only: another size of the same size run may still be
  // pointing at these files (see removeUnreferencedStorageFiles).
  await removeUnreferencedStorageFiles(admin, storagePaths);

  revalidatePath("/admin/prodotti");
  revalidatePath("/catalogo");
  revalidatePath(`/prodotto/${product.slug}`);

  return { error: null };
}
