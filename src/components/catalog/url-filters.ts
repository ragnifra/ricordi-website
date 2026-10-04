export type SortOption = "newest" | "price-asc" | "price-desc";

// Display order of the sort menu; the labels live in the site dictionary
// (catalog.sort).
export const SORT_OPTIONS: readonly SortOption[] = ["newest", "price-asc", "price-desc"];

export function parseListParam(searchParams: URLSearchParams, key: string): string[] {
  const raw = searchParams.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildQueryString(
  current: URLSearchParams,
  updates: Record<string, string | null>
): string {
  const params = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  return params.toString();
}
