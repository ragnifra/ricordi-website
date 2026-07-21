export type SitePage = {
  title: string;
  href: string;
  keywords: string[];
};

// Static index of public content pages (catalog/admin/product-detail routes
// are excluded: the catalog is covered by product search, and there's no
// static title to index for a dynamic product-detail route).
export const SITE_PAGES: SitePage[] = [
  {
    title: "Catalogo",
    href: "/catalogo",
    keywords: ["catalogo", "prodotti", "shop", "negozio", "articoli", "collezione"],
  },
  {
    title: "Chi Siamo",
    href: "/chi-siamo",
    keywords: ["chi siamo", "chi", "siamo", "about", "storia", "team"],
  },
  {
    title: "Vendi con noi",
    href: "/vendi-con-noi",
    keywords: ["vendi con noi", "vendi", "vendita", "vendere", "consegna", "sell"],
  },
  {
    title: "FAQ",
    href: "/faq",
    keywords: ["faq", "domande", "domande frequenti", "aiuto", "help"],
  },
  {
    title: "Contatti",
    href: "/contatti",
    keywords: ["contatti", "contatto", "email", "telefono", "assistenza", "contact"],
  },
];

export function searchSitePages(query: string, limit = 5): SitePage[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return SITE_PAGES.filter((page) => {
    const haystacks = [page.title.toLowerCase(), ...page.keywords];
    return haystacks.some((text) => text.includes(normalized));
  }).slice(0, limit);
}
