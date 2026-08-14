import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getSizesForCategory } from "@/lib/product-sizes";

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

// One card in the catalog grid. A piece sold in several sizes is several
// product rows (one per size, sharing a group_id) but a single card: the
// representative row is the one the card shows and links to, and the customer
// switches size from the size selector on its product page.
//
// The counts describe the sizes of the group that made it through the current
// filters, not the group as a whole — a size-filtered view shows a card for
// the sizes that matched, and nothing on it may contradict that. With no
// filters applied (the default catalog view) the two are the same thing.
// Everything collapsing needs to know about a row. Kept minimal (rather than
// requiring a full Product) so the search route can collapse its own narrower
// projection through the same implementation — it deliberately selects fewer
// columns, and must keep never selecting "cost" or "sold_by_session_id".
export type GroupableProduct = {
  id: string;
  category: string;
  size: string;
  status: ProductStatus;
  groupId: string | null;
};

export type CatalogEntry<T extends GroupableProduct = Product> = {
  product: T;
  sizeCount: number;
  availableSizeCount: number;
};

// Which row gets to represent the group: an available size if there is one,
// then reserved, and a sold row only when the whole group is gone. Because
// the card's SOLD/Riservato badge is read off the representative, this is
// also what guarantees a group with one size left renders as available.
const STATUS_PREFERENCE: Record<ProductStatus, number> = {
  available: 0,
  reserved: 1,
  sold: 2,
};

// Position in the category's size scale, so "smallest first" means 28 before
// 30 and S before XL instead of whatever string order would say. Sizes that
// aren't in the scale (legacy values, or a scale edited later) sort last.
function sizeRank(product: GroupableProduct): number {
  const scale = getSizesForCategory(product.category);
  const index = scale.indexOf(product.size);
  return index === -1 ? scale.length : index;
}

// A total order, so the representative never depends on the row order the
// database happened to return.
function compareCandidates(a: GroupableProduct, b: GroupableProduct): number {
  return (
    STATUS_PREFERENCE[a.status] - STATUS_PREFERENCE[b.status] ||
    sizeRank(a) - sizeRank(b) ||
    a.size.localeCompare(b.size) ||
    a.id.localeCompare(b.id)
  );
}

// Products with no group_id pass through untouched, one entry each. Entries
// keep the order the groups were first seen in, so a caller that fetched rows
// in a meaningful order (relevance, in the search route's case) keeps it.
export function collapseSizeGroups<T extends GroupableProduct>(products: T[]): CatalogEntry<T>[] {
  const entries: CatalogEntry<T>[] = [];
  const byGroup = new Map<string, CatalogEntry<T>>();

  for (const product of products) {
    const isAvailable = product.status === "available";

    if (!product.groupId) {
      entries.push({ product, sizeCount: 1, availableSizeCount: isAvailable ? 1 : 0 });
      continue;
    }

    const entry = byGroup.get(product.groupId);

    if (!entry) {
      const created: CatalogEntry<T> = {
        product,
        sizeCount: 1,
        availableSizeCount: isAvailable ? 1 : 0,
      };
      byGroup.set(product.groupId, created);
      entries.push(created);
      continue;
    }

    entry.sizeCount += 1;
    if (isAvailable) entry.availableSizeCount += 1;
    if (compareCandidates(product, entry.product) < 0) entry.product = product;
  }

  return entries;
}

// The database sorted rows, but a card is shown with its representative's
// price and date — which needn't be the row that decided where the group
// landed in that order. Re-sorting the collapsed list on the representative
// keeps the grid ordered by what it actually displays. Stable, so ties keep
// the database's ordering.
function sortEntries(entries: CatalogEntry[], sort: SortOption): CatalogEntry[] {
  const sorted = [...entries];

  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => a.product.price - b.product.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.product.price - a.product.price);
      break;
    default:
      sorted.sort((a, b) => Date.parse(b.product.createdAt) - Date.parse(a.product.createdAt));
  }

  return sorted;
}

// What every product grid renders: the same query as getProducts, collapsed
// to one entry per piece. `limit` still caps rows, not cards, so a caller
// asking for N cards should over-fetch (see NEW_ARRIVALS_FETCH_LIMIT in
// src/app/page.tsx).
export async function getCatalogEntries(
  filters: CatalogFilters,
  options?: GetProductsOptions
): Promise<CatalogEntry[]> {
  const products = await getProducts(filters, options);
  return sortEntries(collapseSizeGroups(products), filters.sort);
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
