import type { PageId } from "@/lib/i18n/dictionary";

export type SitePage = {
  id: PageId;
  href: string;
  // Both languages, whatever the page language: a visitor may type either.
  keywords: string[];
};

export type SitePageResult = { href: string; title: string };

// Static index of public content pages (catalog/admin/product-detail routes
// are excluded: the catalog is covered by product search, and there's no
// static title to index for a dynamic product-detail route). Titles come
// from the site dictionary (pages), in the visitor's language.
export const SITE_PAGES: SitePage[] = [
  {
    id: "catalog",
    href: "/catalogo",
    keywords: [
      "catalogo", "prodotti", "shop", "negozio", "articoli", "collezione",
      "catalog", "products", "store", "items", "collection",
    ],
  },
  {
    id: "about",
    href: "/chi-siamo",
    keywords: ["chi siamo", "chi", "siamo", "about", "storia", "team", "about us", "story"],
  },
  {
    id: "sell",
    href: "/vendi-con-noi",
    keywords: [
      "vendi con noi", "vendi", "vendita", "vendere", "consegna", "sell",
      "sell with us", "selling", "consign",
    ],
  },
  {
    id: "faq",
    href: "/faq",
    keywords: ["faq", "domande", "domande frequenti", "aiuto", "help", "questions"],
  },
  {
    id: "contact",
    href: "/contatti",
    keywords: [
      "contatti", "contatto", "email", "telefono", "assistenza", "contact",
      "phone", "support",
    ],
  },
  {
    id: "terms",
    href: "/termini-e-condizioni",
    keywords: [
      "termini e condizioni",
      "termini",
      "condizioni",
      "condizioni di vendita",
      "recesso",
      "reso",
      "resi",
      "garanzia",
      "spedizione",
      "terms",
      "terms and conditions",
      "withdrawal",
      "returns",
      "refund",
      "warranty",
      "shipping",
    ],
  },
];

export function searchSitePages(
  query: string,
  titles: Record<PageId, string>,
  limit = 5
): SitePageResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return SITE_PAGES.filter((page) => {
    const haystacks = [titles[page.id].toLowerCase(), ...page.keywords];
    return haystacks.some((text) => text.includes(normalized));
  })
    .slice(0, limit)
    .map((page) => ({ href: page.href, title: titles[page.id] }));
}
