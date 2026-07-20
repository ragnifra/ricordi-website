import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { buildImageUrl, effectiveStatus, type ProductStatus } from "@/lib/catalog";

// Admin-only product shape: unlike src/lib/catalog.ts (public-facing), this
// intentionally includes "cost" and "sold_by_session_id" — both are fine to
// read here since every page under /admin/(protected) is auth-gated, but
// must never leak into a public-facing query (see AGENTS.md).
export type AdminProductImage = {
  id: string;
  storagePath: string;
  url: string;
  position: number;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  price: number;
  cost: number | null;
  description: string | null;
  authenticityNotes: string | null;
  status: ProductStatus;
  reservedUntil: string | null;
  soldAt: string | null;
  soldBySessionId: string | null;
  createdAt: string;
  images: AdminProductImage[];
};

type AdminProductImageRow = {
  id: string;
  storage_path: string;
  position: number;
};

type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  price: number;
  cost: number | null;
  description: string | null;
  authenticity_notes: string | null;
  status: ProductStatus;
  reserved_until: string | null;
  sold_at: string | null;
  sold_by_session_id: string | null;
  created_at: string;
  product_images: AdminProductImageRow[] | null;
};

const ADMIN_PRODUCT_SELECT =
  "id, slug, name, brand, category, size, condition, price, cost, description, authenticity_notes, status, reserved_until, sold_at, sold_by_session_id, created_at, product_images(id, storage_path, position)";

function mapAdminProductRow(row: AdminProductRow): AdminProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    size: row.size,
    condition: row.condition,
    price: row.price,
    cost: row.cost,
    description: row.description,
    authenticityNotes: row.authenticity_notes,
    status: effectiveStatus(row.status, row.reserved_until),
    reservedUntil: row.reserved_until,
    soldAt: row.sold_at,
    soldBySessionId: row.sold_by_session_id,
    createdAt: row.created_at,
    images: (row.product_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        id: image.id,
        storagePath: image.storage_path,
        position: image.position,
        url: buildImageUrl(image.storage_path),
      })),
  };
}

// Reads use the admin client directly (no RLS, no re-auth): every route
// under /admin/(protected) is already gated by that layout's auth check.
// Mutations are different — see the actions in src/lib/actions, which each
// re-check auth since they can be invoked independent of a page render.
export async function getAdminProducts(): Promise<AdminProduct[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .order("position", { ascending: true, referencedTable: "product_images" })
    .returns<AdminProductRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapAdminProductRow);
}

export async function getAdminProductById(id: string): Promise<AdminProduct | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .order("position", { ascending: true, referencedTable: "product_images" })
    .maybeSingle()
    .returns<AdminProductRow>();

  if (error) throw error;
  if (!data) return null;

  return mapAdminProductRow(data);
}
