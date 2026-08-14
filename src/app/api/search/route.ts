import { createClient } from "@/lib/supabase/server";
import {
  buildImageUrl,
  collapseSizeGroups,
  effectiveStatus,
  type GroupableProduct,
  type ProductStatus,
} from "@/lib/catalog";
import type { SearchProductResult, SearchResponse } from "@/lib/search";

const RESULT_LIMIT = 8;
// A piece sold in several sizes is several rows but one result, and the
// limit caps rows, not collapsed entries — without headroom a single size run
// could fill the whole response and leave one hit. Same reasoning as
// NEW_ARRIVALS_FETCH_LIMIT in src/app/page.tsx.
const FETCH_LIMIT = RESULT_LIMIT * 3;
const MAX_QUERY_LENGTH = 100;

// "cost" and "sold_by_session_id" are intentionally absent — both are
// admin/webhook-internal and must never reach a public-facing page. The
// columns beyond what the response carries (id, category, size, group_id)
// exist only to collapse size groups server-side; they're dropped again by
// toResult before anything is sent.
const SELECT =
  "id, slug, name, brand, category, size, price, status, reserved_until, group_id, product_images(storage_path, position)";

type ProductImageRow = {
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
  price: number;
  status: ProductStatus;
  reserved_until: string | null;
  group_id: string | null;
  product_images: ProductImageRow[] | null;
};

// A result plus the fields collapseSizeGroups needs to pick one row per
// piece. Server-side only.
type SearchCandidate = SearchProductResult & GroupableProduct;

// Escapes the characters that carry special meaning inside an ilike pattern
// (%, _, and the escape character itself) so user input can only ever narrow
// the match, never widen it with unintended wildcards.
function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

function mapRow(row: ProductRow): SearchCandidate {
  const images = (row.product_images ?? []).slice().sort((a, b) => a.position - b.position);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    size: row.size,
    price: row.price,
    status: effectiveStatus(row.status, row.reserved_until),
    groupId: row.group_id,
    imageUrl: images.length > 0 ? buildImageUrl(images[0].storage_path) : null,
  };
}

// Drops the grouping-only fields, so the response stays exactly the shape the
// overlay consumes.
function toResult(candidate: SearchCandidate): SearchProductResult {
  return {
    slug: candidate.slug,
    name: candidate.name,
    brand: candidate.brand,
    price: candidate.price,
    status: candidate.status,
    imageUrl: candidate.imageUrl,
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
  const [nameMatches, brandMatches] = await Promise.all([
    supabase.from("products").select(SELECT).ilike("name", pattern).limit(FETCH_LIMIT).returns<ProductRow[]>(),
    supabase.from("products").select(SELECT).ilike("brand", pattern).limit(FETCH_LIMIT).returns<ProductRow[]>(),
  ]);

  if (nameMatches.error || brandMatches.error) {
    console.error("Search API: product query failed", nameMatches.error ?? brandMatches.error);
    return Response.json({ products: [] } satisfies SearchResponse, { status: 500 });
  }

  const seenSlugs = new Set<string>();
  const candidates: SearchCandidate[] = [];

  // Name matches first, then brand matches — collapsing preserves that order,
  // and the cap is applied afterwards so a size run costs one slot instead of
  // one per size.
  for (const row of [...(nameMatches.data ?? []), ...(brandMatches.data ?? [])]) {
    if (seenSlugs.has(row.slug)) continue;
    seenSlugs.add(row.slug);
    candidates.push(mapRow(row));
  }

  const products = collapseSizeGroups(candidates)
    .slice(0, RESULT_LIMIT)
    .map((entry) => toResult(entry.product));

  return Response.json({ products } satisfies SearchResponse);
}
