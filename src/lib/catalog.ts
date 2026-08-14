import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProductStatus = "available" | "reserved" | "sold";

export type SortOption = "newest" | "price-asc" | "price-desc";

export type ProductImage = {
  id: string;
  url: string;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  price: number;
  description: string | null;
  authenticityNotes: string | null;
  status: ProductStatus;
  // Non-null when this row is one size of a size run: the other sizes are the
  // rows sharing this group_id. Purely a display link — each size is still an
  // independent product with its own price, status and checkout.
  groupId: string | null;
  createdAt: string;
  images: ProductImage[];
};

export type CatalogFilters = {
  brand: string[];
  category: string[];
  size: string[];
  min: number | null;
  max: number | null;
  sort: SortOption;
};

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type FilterOptions = {
  brands: string[];
  categories: string[];
  sizes: string[];
};

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");

export function buildImageUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${storagePath}`;
}

type ProductImageRow = {
  id: string;
  storage_path: string;
  position: number;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  price: number;
  description: string | null;
  authenticity_notes: string | null;
  status: ProductStatus;
  reserved_until: string | null;
  group_id: string | null;
  created_at: string;
  product_images: ProductImageRow[] | null;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseList(value: string | string[] | undefined): string[] {
  const raw = firstValue(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumber(value: string | string[] | undefined): number | null {
  const raw = firstValue(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSort(value: string | string[] | undefined): SortOption {
  const raw = firstValue(value);
  return raw === "price-asc" || raw === "price-desc" ? raw : "newest";
}

export function parseCatalogFilters(searchParams: CatalogSearchParams): CatalogFilters {
  return {
    brand: parseList(searchParams.brand),
    category: parseList(searchParams.category),
    size: parseList(searchParams.size),
    min: parseNumber(searchParams.min),
    max: parseNumber(searchParams.max),
    sort: parseSort(searchParams.sort),
  };
}

export function countActiveFilters(filters: CatalogFilters): number {
  return (
    filters.brand.length +
    filters.category.length +
    filters.size.length +
    (filters.min !== null ? 1 : 0) +
    (filters.max !== null ? 1 : 0)
  );
}

const PRODUCT_SELECT =
  "id, slug, name, brand, category, size, condition, price, description, authenticity_notes, status, reserved_until, group_id, created_at, product_images(id, storage_path, position)";

// A "reserved" product whose hold has lapsed is treated as available for
// every read — this is what lets correctness not depend on a cron job. The
// checkout action's atomic compare-and-swap independently re-checks the same
// condition at write time, so this is purely a display-layer decision.
export function effectiveStatus(status: ProductStatus, reservedUntil: string | null): ProductStatus {
  if (status === "reserved" && reservedUntil && new Date(reservedUntil) < new Date()) {
    return "available";
  }
  return status;
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    size: row.size,
    condition: row.condition,
    price: row.price,
    description: row.description,
    authenticityNotes: row.authenticity_notes,
    status: effectiveStatus(row.status, row.reserved_until),
    groupId: row.group_id,
    createdAt: row.created_at,
    images: (row.product_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        id: image.id,
        position: image.position,
        url: buildImageUrl(image.storage_path),
      })),
  };
}

export type GetProductsOptions = {
  limit?: number;
};

export async function getProducts(
  filters: CatalogFilters,
  options?: GetProductsOptions
): Promise<Product[]> {
  const supabase = await createClient();

  // "cost" and "sold_by_session_id" are intentionally never selected here —
  // both are admin/webhook-internal and must never reach a public-facing page.
  let query = supabase.from("products").select(PRODUCT_SELECT);

  if (filters.brand.length) query = query.in("brand", filters.brand);
  if (filters.category.length) query = query.in("category", filters.category);
  if (filters.size.length) query = query.in("size", filters.size);
  if (filters.min !== null) query = query.gte("price", filters.min);
  if (filters.max !== null) query = query.lte("price", filters.max);

  // Products with status "reserved" or "sold" are intentionally never
  // excluded here — they stay in the results and are only marked visually.

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.order("position", { ascending: true, referencedTable: "product_images" });

  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query.returns<ProductRow[]>();

  if (error) throw error;

  return (data ?? []).map(mapProductRow);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();

  // "cost" and "sold_by_session_id" are intentionally never selected here —
  // both are admin/webhook-internal and must never reach a public-facing page.
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle()
    .returns<ProductRow>();

  if (error) throw error;
  if (!data) return null;

  return mapProductRow(data);
}

// One size of a size run, as the product page's size selector needs it: which
// size, where it lives, and whether it can still be bought.
export type SizeGroupMember = {
  slug: string;
  size: string;
  status: ProductStatus;
};

type SizeGroupMemberRow = {
  slug: string;
  size: string;
  status: ProductStatus;
  reserved_until: string | null;
};

// The sizes belonging to a group, including the one currently being viewed.
// Reads nothing beyond what the selector renders — "cost" and
// "sold_by_session_id" are admin/webhook-internal and never leave the server.
export async function getSizeGroup(groupId: string): Promise<SizeGroupMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("slug, size, status, reserved_until")
    .eq("group_id", groupId)
    .returns<SizeGroupMemberRow[]>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    slug: row.slug,
    size: row.size,
    status: effectiveStatus(row.status, row.reserved_until),
  }));
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("products").select("brand, category, size");

  if (error) throw error;

  const brands = new Set<string>();
  const categories = new Set<string>();
  const sizes = new Set<string>();

  for (const row of data ?? []) {
    if (row.brand) brands.add(row.brand);
    if (row.category) categories.add(row.category);
    if (row.size) sizes.add(row.size);
  }

  return {
    brands: [...brands].sort(),
    categories: [...categories].sort(),
    sizes: [...sizes].sort(),
  };
}
