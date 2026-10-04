"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, SpinnerGapIcon } from "@phosphor-icons/react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchSitePages, type SitePageResult } from "@/lib/site-pages";
import type { SearchProductResult, SearchResponse } from "@/lib/search";
import { useCopy, useLanguage } from "@/components/i18n/LanguageProvider";
import { formatPrice } from "@/lib/i18n/format";
import { fill } from "@/lib/i18n/labels";

type SearchOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = useCopy();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={inputRef}
        closeLabel={copy.close}
        className="sm:max-h-[70vh] sm:max-w-lg"
        aria-label={copy.search.label}
      >
        <DialogTitle className="sr-only">{copy.search.label}</DialogTitle>
        {/* Remounting on every open (rather than resetting state in an
            effect) is what gives each opening a clean slate. */}
        <SearchOverlayBody
          key={open ? "open" : "closed"}
          inputRef={inputRef}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type SearchOverlayBodyProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
};

function SearchOverlayBody({ inputRef, onClose }: SearchOverlayBodyProps) {
  const router = useRouter();
  const lang = useLanguage();
  const copy = useCopy();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchProductResult[]>([]);
  // The query `products` was fetched for, rather than a separate "loading"
  // flag — this lets isSearching/staleness be derived at render time instead
  // of set imperatively from the effect, and doubles as the guard that keeps
  // a just-superseded response from flashing stale results.
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const hasQuery = debouncedQuery.length > 0;
  const isSearching = hasQuery && resultsQuery !== debouncedQuery;
  const currentProducts = resultsQuery === debouncedQuery ? products : [];

  const pages = useMemo(
    () => searchSitePages(debouncedQuery, copy.pages),
    [debouncedQuery, copy.pages]
  );

  useEffect(() => {
    if (!debouncedQuery) return;

    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<SearchResponse>)
      .then((data) => {
        setProducts(data.products ?? []);
        setResultsQuery(debouncedQuery);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Search request failed", error);
        setProducts([]);
        setResultsQuery(debouncedQuery);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const firstResultHref = !hasQuery || isSearching
    ? null
    : currentProducts.length > 0
      ? `/prodotto/${currentProducts[0].slug}`
      : (pages[0]?.href ?? null);

  function goTo(href: string) {
    onClose();
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && firstResultHref) {
      event.preventDefault();
      goTo(firstResultHref);
    }
  }

  const hasResults = hasQuery && (currentProducts.length > 0 || pages.length > 0);

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={copy.search.placeholder}
          aria-label={copy.search.label}
          className="h-8 border-none bg-transparent px-0 focus-visible:ring-0"
        />
        {isSearching && (
          <SpinnerGapIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasQuery && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {copy.search.idle}
          </p>
        )}

        {hasQuery && !isSearching && !hasResults && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {fill(copy.search.noResults, { query: debouncedQuery })}
          </p>
        )}

        {hasQuery && currentProducts.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-[0.65rem] font-medium tracking-[0.15em] text-muted-foreground uppercase">
              {copy.search.products}
            </h3>
            <ul className="flex flex-col">
              {currentProducts.map((product) => (
                <li key={product.slug}>
                  <Link
                    href={`/prodotto/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 py-2 transition-colors hover:bg-muted"
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden bg-muted">
                      {product.imageUrl && (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        translate="no"
                        className="truncate text-[0.65rem] tracking-widest text-muted-foreground uppercase"
                      >
                        {product.brand}
                      </p>
                      <p className="truncate text-xs text-foreground">{product.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p translate="no" className="text-xs text-foreground">
                        {formatPrice(lang, product.price)}
                      </p>
                      {product.status !== "available" && (
                        <p className="text-[0.6rem] tracking-widest text-muted-foreground uppercase">
                          {copy.status[product.status]}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasQuery && pages.length > 0 && (
          <div>
            <h3 className="mb-2 text-[0.65rem] font-medium tracking-[0.15em] text-muted-foreground uppercase">
              {copy.search.pages}
            </h3>
            <ul className="flex flex-col">
              {pages.map((page: SitePageResult) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    onClick={onClose}
                    className="block py-2 text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
