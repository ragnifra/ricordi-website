import { createClient } from "@/lib/supabase/server";
import { buildImageUrl, effectiveStatus, type ProductStatus } from "@/lib/catalog";
import type { SearchProductResult, SearchResponse } from "@/lib/search";

const RESULT_LIMIT = 8;
const MAX_QUERY_LENGTH = 100;

const SELECT = "slug, name, brand, price, status, reserved_until, product_images(storage_path, position)";

type ProductImageRow = {
  storage_path: string;
  position: number;
};

type ProductRow = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  status: ProductStatus;
  reserved_until: string | null;
  product_images: ProductImageRow[] | null;
};

// Escapes the characters that carry special meaning inside an ilike pattern
// (%, _, and the escape character itself) so user input can only ever narrow
// the match, never widen it with unintended wildcards.
function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

function mapRow(row: ProductRow): SearchProductResult {
  const images = (row.product_images ?? []).slice().sort((a, b) => a.position - b.position);

  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    price: row.price,
    status: effectiveStatus(row.status, row.reserved_until),
    imageUrl: images.length > 0 ? buildImageUrl(images[0].storage_path) : null,
  };
}

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, MAX_QUERY_LENGTH) ?? "";

  if (!query) {
    return Response.json({ products: [] } satisfies SearchResponse);
  }

  const supabase = await createClient();
  const pattern = `%${escapeIlikePattern(query)}%`;

  // Two separate ilike queries (rather than a single `.or(...)` filter
  // string) so the user's query never has to be interpolated into
  // PostgREST's filter-expression syntax — it only ever travels as an
  // ordinary ilike pattern value.
  //
  // "cost" and "sold_by_session_id" are intentionally never selected here —
  // both are admin/webhook-internal and must never reach a public-facing page.
  const [nameMatches, brandMatches] = await Promise.all([
    supabase.from("products").select(SELECT).ilike("name", pattern).limit(RESULT_LIMIT).returns<ProductRow[]>(),
    supabase.from("products").select(SELECT).ilike("brand", pattern).limit(RESULT_LIMIT).returns<ProductRow[]>(),
  ]);

  if (nameMatches.error || brandMatches.error) {
    console.error("Search API: product query failed", nameMatches.error ?? brandMatches.error);
    return Response.json({ products: [] } satisfies SearchResponse, { status: 500 });
  }

  const seenSlugs = new Set<string>();
  const products: SearchProductResult[] = [];

  for (const row of [...(nameMatches.data ?? []), ...(brandMatches.data ?? [])]) {
    if (seenSlugs.has(row.slug)) continue;
    seenSlugs.add(row.slug);
    products.push(mapRow(row));
    if (products.length >= RESULT_LIMIT) break;
  }

  return Response.json({ products } satisfies SearchResponse);
}
