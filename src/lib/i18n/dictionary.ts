// Every fixed text of the public site, in both languages. Pure data — no
// secrets, no I/O. Same pattern as the order confirmation email
// (src/lib/email/purchase-confirmation-copy.ts):
//
// - SITE_COPY is checked against SiteCopy for BOTH languages, so a key
//   missing, misspelt or extra in either one is a compile error.
// - Taxonomy labels are keyed by the taxonomy's own types (Category,
//   MeasurementFieldId, Condition…), so adding a category or measurement in
//   src/lib/taxonomy.ts without an English label here doesn't compile. The
//   Italian label is the stored value itself.
// - Condition labels are taken from the email dictionary, so the site and
//   the email always use the same words.
// - Brand copy (About, hero tagline, footer disclaimer, meta description) is
//   the owner's supplied wording: verbatim, never "improved". Keep the word
//   noleggiamo / rent.
//
// Not covered on purpose: the admin area (Italian only), the Terms page body
// (Italian legal text, src/lib/legal/terms.ts and the page itself), and the
// checkout area (EmbeddedCheckoutMount, checkout page and loading) — see
// AGENTS.md.
//
// Server components read it via getCopy() (src/lib/i18n/server.ts); client
// components receive the active language's copy through LanguageProvider, so
// this module never ships to the browser.

import { EMAIL_COPY } from "@/lib/email/purchase-confirmation-copy";
import type { SizeGuideTableId } from "@/lib/size-guide";
import {
  CATEGORY_OPTIONS,
  MEASUREMENT_FIELDS,
  type Category,
  type Department,
  type Gender,
  type MeasurementFieldId,
} from "@/lib/taxonomy";
import type { Condition } from "@/lib/product-form";
import type { Language } from "@/lib/i18n/config";

export type PageId = "catalog" | "about" | "sell" | "faq" | "contact" | "terms";
export type SortOptionId = "newest" | "price-asc" | "price-desc";

export type FaqItem = { id: string; question: string; answer: string };

export type SizeGuideTableCopy = {
  label: string;
  title: string;
  note: string | null;
  // One header per column of the table's rows in src/lib/size-guide.ts.
  columns: readonly string[];
};

export type SiteCopy = {
  meta: { siteName: string; description: string };
  /** Page names: header menu, footer links, site search, document titles. */
  pages: Record<PageId, string>;
  header: { openMenu: string; menuTitle: string; homeLabel: string; search: string };
  home: { tagline: string; cta: string; newArrivals: string; viewAll: string };
  /** {n} and {total} are placeholders. */
  carousel: { region: string; slide: string; previous: string; next: string; pause: string; play: string };
  about: { paragraphs: readonly string[] };
  faq: {
    title: string;
    intro: string;
    items: readonly FaqItem[];
    notFoundBefore: string;
    notFoundLink: string;
    notFoundAfter: string;
  };
  sell: {
    title: string;
    lead: string;
    cta: string;
    steps: readonly { heading: string; body: string }[];
    whatWeBuyTitle: string;
    whatWeBuy: string;
  };
  contact: { intro: string; email: string; phone: string };
  catalog: {
    pieceOne: string;
    pieceMany: string;
    sort: Record<SortOptionId, string>;
    refine: string;
    emptyTitle: string;
    emptyHint: string;
  };
  /** {size} and {value} are placeholders. */
  filters: {
    title: string;
    brand: string;
    category: string;
    size: string;
    price: string;
    min: string;
    max: string;
    anyPlaceholder: string;
    clearAll: string;
    apply: string;
    sizeChip: string;
    minChip: string;
    maxChip: string;
  };
  /** {query} is a placeholder. */
  search: { label: string; placeholder: string; idle: string; noResults: string; products: string; pages: string };
  /** {n} and {count} are placeholders. */
  product: {
    description: string;
    size: string;
    condition: string;
    measurements: string;
    composition: string;
    authenticityNotes: string;
    buy: string;
    reserved: string;
    sold: string;
    sizeUnavailable: string;
    /** Shown when a free-text field is in a language other than the page's. */
    italianTextNote: string;
    banners: { unavailable: string; cancelled: string; error: string };
    noImage: string;
    viewImage: string;
    previousImage: string;
    nextImage: string;
    sizesAvailable: string;
  };
  sizeGuide: {
    trigger: string;
    description: string;
    disclaimer: string;
    tables: Record<SizeGuideTableId, SizeGuideTableCopy>;
  };
  footer: { disclaimer: string };
  /** Shown above the (Italian) Terms page in English mode only. */
  terms: { notice: string | null };
  status: { reserved: string; sold: string };
  /** Accessible name of the close button on sheets and dialogs. */
  close: string;
  taxonomy: {
    genders: Record<Gender, string>;
    departments: Record<Department, string>;
    categories: Record<Category, string>;
    conditions: Record<Condition, string>;
    measurements: Record<MeasurementFieldId, string>;
    /** Size values that are words rather than codes. */
    sizeValues: Record<"Taglia unica", string>;
  };
};

// Italian category labels are the stored values themselves.
const ITALIAN_CATEGORIES = Object.fromEntries(
  CATEGORY_OPTIONS.map((category) => [category, category])
) as Record<Category, string>;

export const SITE_COPY = {
  it: {
    meta: {
      siteName: "Ricordi Archive",
      description:
        "Ricordi Archive è un archivio indipendente di luxury fashion e high-end streetwear: capi selezionati e verificati, pezzi unici dal mercato secondario.",
    },
    pages: {
      catalog: "Catalogo",
      about: "Chi Siamo",
      sell: "Vendi con noi",
      faq: "FAQ",
      contact: "Contatti",
      terms: "Termini e Condizioni",
    },
    header: {
      openMenu: "Apri menu",
      menuTitle: "Menu",
      homeLabel: "Ricordi Archive — home",
      search: "Cerca",
    },
    home: {
      tagline: "Un archivio indipendente: luxury fashion, high-end streetwear e borse firmate.",
      cta: "Esplora l'archivio",
      newArrivals: "Nuovi arrivi",
      viewAll: "Vedi tutto",
    },
    carousel: {
      region: "Foto editoriali",
      slide: "Foto {n} di {total}",
      previous: "Foto precedente",
      next: "Foto successiva",
      pause: "Metti in pausa",
      play: "Riproduci",
    },
    about: {
      paragraphs: [
        "Ricordi Archive è un archivio indipendente di luxury fashion e high-end streetwear. Selezioniamo ogni articolo che rispecchi le tendenze attuali e racconti una storia, per portare capi ricercati a chi ama la moda in tutte le sue sfaccettature.",
        "Vendiamo, acquistiamo e noleggiamo. Diamo una seconda vita al lusso e lo rendiamo accessibile a chi ne sa riconoscere il valore.",
        "Non siamo affiliati ai marchi presenti, che appartengono ai rispettivi titolari.",
      ],
    },
    faq: {
      title: "Domande frequenti",
      intro: "Hai domande da farci?",
      items: [
        {
          id: "spedizione",
          question: "Quali sono i tempi e i costi di spedizione?",
          answer:
            "Spediamo in Italia, nei Paesi dell'Unione Europea e negli Stati Uniti con corriere tracciato. I tempi di consegna stimati in Italia sono di 2-4 giorni lavorativi dalla presa in carico del corriere. Il costo viene calcolato al checkout in base alla destinazione e al collo; la spedizione in Italia è gratuita per ordini da 150 €. Per le spedizioni fuori dall'UE (es. Stati Uniti) possono applicarsi dazi e oneri doganali a carico del cliente.",
        },
        {
          id: "autenticita",
          question: "Come garantite l'autenticità dei prodotti?",
          answer:
            "Ogni pezzo viene verificato internamente prima della messa in vendita (materiali, hardware, etichette, numeri di serie e, quando presente, documentazione originale). Se dopo l'acquisto emergessero dubbi fondati sull'autenticità, contattaci: verificata la contestazione, rimborsiamo integralmente prezzo e spese di spedizione, previa restituzione dell'articolo.",
        },
        {
          id: "resi",
          question: "Qual è la vostra politica di reso?",
          answer:
            "Se acquisti come consumatore hai 14 giorni dalla consegna per recedere, senza doverne spiegare il motivo, scrivendo a ricordiarchive@hotmail.com. Il capo va restituito integro, non utilizzato, non lavato né alterato, completo di cartellini, etichette, accessori e confezione originale. Le spese di restituzione sono a carico del cliente e il rimborso avviene con lo stesso metodo di pagamento. Il recesso non si applica a intimo, calze, costumi da bagno, lingerie e orecchini se aperti dopo la consegna. Trattandosi di pezzi unici, non è prevista la sostituzione con un articolo equivalente. Tutti i dettagli sono nei Termini e Condizioni.",
        },
        {
          id: "difetti",
          question: "Cosa succede se il capo ha un difetto?",
          answer:
            "Ai prodotti si applica la garanzia legale di conformità. Trattandosi di beni usati, la durata è di 1 anno dalla consegna. Non sono coperti i segni del normale uso pregresso e le imperfezioni indicate nella scheda prodotto. Per farla valere scrivi a ricordiarchive@hotmail.com descrivendo il difetto e allegando delle foto.",
        },
        {
          id: "taglie",
          question: "Come faccio a scegliere la taglia giusta?",
          answer:
            "Ogni scheda prodotto riporta la taglia e, dove applicabile, le misure rilevate del capo in centimetri. In caso di dubbi su vestibilità o corrispondenza tra taglie di brand diversi, scrivici tramite la pagina Contatti: ti aiutiamo a scegliere la taglia più adatta.",
        },
        {
          id: "pagamenti",
          question: "I pagamenti sono sicuri?",
          answer:
            "Sì. Tutti i pagamenti vengono elaborati tramite Stripe Checkout, che utilizza standard di sicurezza a livello bancario. Non memorizziamo mai i dati della tua carta sui nostri server.",
        },
      ],
      notFoundBefore: "Non hai trovato la risposta che cercavi? ",
      notFoundLink: "Contattaci",
      notFoundAfter: ", ti risponderemo il prima possibile.",
    },
    sell: {
      title: "Vendi a noi i tuoi articoli",
      lead: "Monetizza istantaneamente il tuo guardaroba luxury senza aspettare i tempi del conto vendita. Acquistiamo direttamente i tuoi pezzi.",
      cta: "Inizia ora",
      steps: [
        {
          heading: "Inviaci le foto",
          body: "Mostraci il tuo capo, borsa o accessorio con foto chiare di condizioni, etichette ed eventuali prove di autenticità.",
        },
        {
          heading: "Offerta immediata",
          body: "Il nostro team valuta l'articolo e ti propone un'offerta d'acquisto diretto per il pagamento immediato, basata sulle condizioni e sulla commerciabilità del pezzo.",
        },
        {
          heading: "Spedizione e pagamento",
          body: "Spedisci il capo al nostro archivio. Una volta ricevuto e verificato fisicamente il pezzo, riceverai il pagamento concordato tramite bonifico entro 24 ore.",
        },
      ],
      whatWeBuyTitle: "Cosa acquistiamo",
      whatWeBuy:
        "Se hai nel guardaroba capi, borse o accessori dei brand che contano, noi li compriamo. Valutiamo qualsiasi pezzo 100% autentico che lasci il segno: dal lusso classico e d'avanguardia di Louis Vuitton, Balenciaga e Vetements, ai capisaldi del capospalla e del techwear come Moncler, Stone Island e C.P. Company, fino ai pezzi cult e all'hype di Amiri, Rick Owens, Chrome Hearts, Supreme e Palace. Hai un pezzo d'archivio iconico (e non solo) o un articolo di un altro brand di livello? Proponicelo. Se è originale ed è speciale, lo prendiamo.",
    },
    contact: {
      intro:
        "Hai domande, vuoi vendere un pezzo o richiedere informazioni su un articolo del catalogo? Scrivici o chiamaci: siamo qui per aiutarti.",
      email: "Email",
      phone: "Telefono",
    },
    catalog: {
      pieceOne: "pezzo",
      pieceMany: "pezzi",
      sort: {
        newest: "Più recenti",
        "price-asc": "Prezzo crescente",
        "price-desc": "Prezzo decrescente",
      },
      refine: "Filtra",
      emptyTitle: "Nessun pezzo trovato",
      emptyHint: "Prova a modificare o azzerare i filtri.",
    },
    filters: {
      title: "Filtra",
      brand: "Marca",
      category: "Categoria",
      size: "Taglia",
      price: "Prezzo",
      min: "Min",
      max: "Max",
      anyPlaceholder: "Qualsiasi",
      clearAll: "Azzera",
      apply: "Applica",
      sizeChip: "Taglia {size}",
      minChip: "Min €{value}",
      maxChip: "Max €{value}",
    },
    search: {
      label: "Cerca",
      placeholder: "Cerca prodotti, marche, pagine...",
      idle: "Cerca tra prodotti e pagine del sito.",
      noResults: "Nessun risultato per “{query}”",
      products: "Prodotti",
      pages: "Pagine",
    },
    product: {
      description: "Descrizione",
      size: "Taglia",
      condition: "Condizioni",
      measurements: "Misure",
      composition: "Composizione",
      authenticityNotes: "Note di autenticità",
      buy: "Acquista",
      reserved: "Riservato — verifica tra qualche minuto",
      sold: "Venduto",
      sizeUnavailable: "Taglia non disponibile",
      italianTextNote: "Le descrizioni dei prodotti sono scritte in italiano.",
      banners: {
        unavailable: "Questo pezzo è appena stato riservato da un altro cliente.",
        cancelled: "Checkout annullato: la tua prenotazione è ancora attiva.",
        error: "Si è verificato un errore. Riprova.",
      },
      noImage: "Nessuna immagine",
      viewImage: "Mostra immagine {n}",
      previousImage: "Immagine precedente",
      nextImage: "Immagine successiva",
      sizesAvailable: "{count} taglie",
    },
    sizeGuide: {
      trigger: "Guida alle taglie",
      description: "Conversioni indicative tra i sistemi di taglia.",
      disclaimer:
        "Le taglie dei brand di lusso e designer vestono spesso strette o oversize rispetto alle conversioni qui sopra. Quando disponibili, le misure del capo indicate nella scheda prodotto sono il riferimento più affidabile.",
      tables: {
        abbigliamentoUomo: {
          label: "Abbigliamento uomo",
          title: "Abbigliamento — Uomo",
          note: "T-shirt, maglieria, camicie, giacche e cappotti.",
          columns: ["Taglia", "IT", "EU", "US/UK"],
        },
        pantaloniUomo: {
          label: "Pantaloni uomo",
          title: "Pantaloni e jeans — Uomo",
          note: null,
          columns: ["IT", "EU/FR", "US denim", "Girovita"],
        },
        abbigliamentoDonna: {
          label: "Abbigliamento donna",
          title: "Abbigliamento — Donna",
          note: "Top, maglieria, abiti, gonne, giacche e cappotti.",
          columns: ["Taglia", "IT", "EU", "US", "UK"],
        },
        pantaloniDonna: {
          label: "Pantaloni donna",
          title: "Pantaloni e jeans — Donna",
          note: null,
          columns: ["IT", "EU/DE", "US denim", "UK"],
        },
        calzature: {
          label: "Calzature",
          title: "Calzature — Uomo e donna",
          note: null,
          columns: ["EU", "US uomo", "US donna", "UK", "Piede"],
        },
      },
    },
    footer: {
      disclaimer:
        "Ricordi Archive opera come archivio e rivenditore indipendente. I capi proposti provengono da collezioni private e dal mercato secondario (articoli nuovi con cartellino o d'archivio) e sono verificati internamente. Tutti i marchi appartengono ai rispettivi proprietari.",
    },
    terms: { notice: null },
    status: { reserved: "Riservato", sold: "Venduto" },
    close: "Chiudi",
    taxonomy: {
      genders: { Uomo: "Uomo", Donna: "Donna" },
      departments: {
        Abbigliamento: "Abbigliamento",
        Scarpe: "Scarpe",
        Borse: "Borse",
        Accessori: "Accessori",
      },
      categories: ITALIAN_CATEGORIES,
      conditions: EMAIL_COPY.it.conditions,
      measurements: MEASUREMENT_FIELDS,
      sizeValues: { "Taglia unica": "Taglia unica" },
    },
  },
  en: {
    meta: {
      siteName: "Ricordi Archive",
      description:
        "Ricordi Archive is an independent archive of luxury fashion and high-end streetwear: selected, verified pieces from the secondary market.",
    },
    pages: {
      catalog: "Catalog",
      about: "About",
      sell: "Sell with us",
      faq: "FAQ",
      contact: "Contact",
      terms: "Terms and Conditions",
    },
    header: {
      openMenu: "Open menu",
      menuTitle: "Menu",
      homeLabel: "Ricordi Archive — home",
      search: "Search",
    },
    home: {
      tagline: "An independent archive: luxury fashion, high-end streetwear & designer bags.",
      cta: "Explore the archive",
      newArrivals: "New arrivals",
      viewAll: "View all",
    },
    carousel: {
      region: "Editorial photos",
      slide: "Photo {n} of {total}",
      previous: "Previous photo",
      next: "Next photo",
      pause: "Pause",
      play: "Play",
    },
    about: {
      paragraphs: [
        "Ricordi Archive is an independent archive of luxury fashion and high-end streetwear. We select every item that reflects current trends and tells a story, bringing sought-after pieces to those who love fashion in all its facets.",
        "We sell, buy and rent. We give luxury a second life and make it accessible to those who know how to recognize its value.",
        "We are not affiliated with the brands featured, whose trademarks belong to their respective owners.",
      ],
    },
    faq: {
      title: "Frequently asked questions",
      intro: "Got a question for us?",
      items: [
        {
          id: "spedizione",
          question: "What are the shipping times and costs?",
          answer:
            "We ship to Italy, the countries of the European Union and the United States with a tracked courier. Estimated delivery times in Italy are 2-4 working days from the moment the parcel is handed to the courier. The cost is calculated at checkout based on the destination and the parcel; shipping within Italy is free for orders of €150 or more. Shipments outside the EU (e.g. the United States) may be subject to customs duties and charges, which are borne by the customer.",
        },
        {
          id: "autenticita",
          question: "How do you guarantee the authenticity of your items?",
          answer:
            "Every piece is verified in-house before it goes on sale (materials, hardware, labels, serial numbers and, where available, original documentation). If well-founded doubts about authenticity arise after your purchase, contact us: once the claim has been verified, we refund the full price and shipping costs, subject to the item being returned.",
        },
        {
          id: "resi",
          question: "What is your returns policy?",
          answer:
            "If you buy as a consumer, you have 14 days from delivery to withdraw from the contract, without giving any reason, by writing to ricordiarchive@hotmail.com. The item must be returned intact, unused, unwashed and unaltered, complete with tags, labels, accessories and original packaging. Return costs are borne by the customer and the refund is made using the same payment method. The right of withdrawal does not apply to underwear, socks, swimwear, lingerie and earrings if opened after delivery. As the items are unique pieces, a replacement with an equivalent item is not offered. Full details are in the Terms and Conditions.",
        },
        {
          id: "difetti",
          question: "What if the item has a defect?",
          answer:
            "Our products are covered by the legal guarantee of conformity. As they are used goods, it lasts 1 year from delivery. Signs of normal previous use and imperfections stated on the product page are not covered. To make a claim, write to ricordiarchive@hotmail.com describing the defect and attaching photos.",
        },
        {
          id: "taglie",
          question: "How do I choose the right size?",
          answer:
            "Every product page shows the size and, where applicable, the garment's measurements in centimetres. If you are unsure about fit or how sizes compare across brands, write to us through the Contact page: we will help you choose the right size.",
        },
        {
          id: "pagamenti",
          question: "Are payments secure?",
          answer:
            "Yes. All payments are processed through Stripe Checkout, which uses bank-level security standards. We never store your card details on our servers.",
        },
      ],
      notFoundBefore: "Didn't find the answer you were looking for? ",
      notFoundLink: "Contact us",
      notFoundAfter: " and we will get back to you as soon as possible.",
    },
    sell: {
      title: "Sell us your pieces",
      lead: "Turn your luxury wardrobe into cash instantly, without waiting on consignment. We buy your pieces outright.",
      cta: "Get started",
      steps: [
        {
          heading: "Send us photos",
          body: "Show us your garment, bag or accessory with clear photos of its condition, labels and any proof of authenticity.",
        },
        {
          heading: "Instant offer",
          body: "Our team assesses the item and makes you a direct purchase offer for immediate payment, based on the piece's condition and marketability.",
        },
        {
          heading: "Shipping and payment",
          body: "Ship the item to our archive. Once we have received the piece and physically verified it, you will receive the agreed payment by bank transfer within 24 hours.",
        },
      ],
      whatWeBuyTitle: "What we buy",
      whatWeBuy:
        "If your wardrobe holds garments, bags or accessories from the brands that matter, we buy them. We consider any 100% authentic piece that makes a statement: from the classic and avant-garde luxury of Louis Vuitton, Balenciaga and Vetements, to outerwear and techwear staples such as Moncler, Stone Island and C.P. Company, through to the cult pieces and hype of Amiri, Rick Owens, Chrome Hearts, Supreme and Palace. Have an iconic archive piece (or anything else) or an item from another high-end brand? Offer it to us. If it's original and special, we'll take it.",
    },
    contact: {
      intro:
        "Have a question, want to sell a piece or need information about an item in the catalog? Write to us or call us: we're here to help.",
      email: "Email",
      phone: "Phone",
    },
    catalog: {
      pieceOne: "piece",
      pieceMany: "pieces",
      sort: {
        newest: "Newest",
        "price-asc": "Price low to high",
        "price-desc": "Price high to low",
      },
      refine: "Refine",
      emptyTitle: "No pieces found",
      emptyHint: "Try adjusting or clearing your filters.",
    },
    filters: {
      title: "Refine",
      brand: "Brand",
      category: "Category",
      size: "Size",
      price: "Price",
      min: "Min",
      max: "Max",
      anyPlaceholder: "Any",
      clearAll: "Clear all",
      apply: "Apply",
      sizeChip: "Size {size}",
      minChip: "Min €{value}",
      maxChip: "Max €{value}",
    },
    search: {
      label: "Search",
      placeholder: "Search products, brands, pages...",
      idle: "Search products and pages across the site.",
      noResults: "No results for “{query}”",
      products: "Products",
      pages: "Pages",
    },
    product: {
      description: "Description",
      size: "Size",
      condition: "Condition",
      measurements: "Measurements",
      composition: "Composition",
      authenticityNotes: "Authenticity notes",
      buy: "Buy",
      reserved: "Reserved — check back in a few minutes",
      sold: "Sold",
      sizeUnavailable: "Size not available",
      italianTextNote: "Product descriptions may be in Italian.",
      banners: {
        unavailable: "This piece was just reserved by someone else.",
        cancelled: "Checkout was cancelled — your reservation is still held.",
        error: "Something went wrong. Please try again.",
      },
      noImage: "No image",
      viewImage: "View image {n}",
      previousImage: "Previous image",
      nextImage: "Next image",
      sizesAvailable: "{count} sizes",
    },
    sizeGuide: {
      trigger: "Size guide",
      description: "Approximate conversions between sizing systems.",
      disclaimer:
        "Luxury and designer brands often run small or oversized compared with the conversions above. Where available, the garment measurements on the product page are the most reliable reference.",
      tables: {
        abbigliamentoUomo: {
          label: "Men's clothing",
          title: "Clothing — Men",
          note: "T-shirts, knitwear, shirts, jackets and coats.",
          columns: ["Size", "IT", "EU", "US/UK"],
        },
        pantaloniUomo: {
          label: "Men's trousers",
          title: "Trousers and jeans — Men",
          note: null,
          columns: ["IT", "EU/FR", "US denim", "Waist"],
        },
        abbigliamentoDonna: {
          label: "Women's clothing",
          title: "Clothing — Women",
          note: "Tops, knitwear, dresses, skirts, jackets and coats.",
          columns: ["Size", "IT", "EU", "US", "UK"],
        },
        pantaloniDonna: {
          label: "Women's trousers",
          title: "Trousers and jeans — Women",
          note: null,
          columns: ["IT", "EU/DE", "US denim", "UK"],
        },
        calzature: {
          label: "Footwear",
          title: "Footwear — Men and women",
          note: null,
          columns: ["EU", "US men", "US women", "UK", "Foot"],
        },
      },
    },
    footer: {
      disclaimer:
        "Ricordi Archive operates as an independent archive and reseller. The pieces we offer come from private collections and the secondary market (new items with tags or archive pieces) and are verified in-house. All trademarks, brand names and logos belong to their respective owners. Ricordi Archive is not affiliated with, sponsored by, or officially connected to any of the brands featured.",
    },
    terms: {
      notice:
        "The Terms and Conditions are provided in Italian, which is the language of the contract (art. 2.5). English courtesy translations of the delivery, customs and withdrawal clauses are included in your order confirmation email.",
    },
    status: { reserved: "Reserved", sold: "Sold" },
    close: "Close",
    taxonomy: {
      genders: { Uomo: "Men", Donna: "Women" },
      departments: {
        Abbigliamento: "Clothing",
        Scarpe: "Shoes",
        Borse: "Bags",
        Accessori: "Accessories",
      },
      categories: {
        "Abbigliamento sportivo": "Sportswear",
        Cappotti: "Coats",
        Abiti: "Dresses",
        Giacche: "Jackets",
        Jeans: "Jeans",
        Tute: "Jumpsuits",
        "Maglieria e maglioni": "Knitwear and jumpers",
        Lingerie: "Lingerie",
        Pantaloni: "Trousers",
        Polo: "Polo shirts",
        Pantaloncini: "Shorts",
        Gonne: "Skirts",
        Top: "Tops",
        Camicie: "Shirts",
        Completi: "Suits",
        "Costumi da bagno": "Swimwear",
        "T-shirt e gilet": "T-shirts and vests",
        "Intimo e calze": "Underwear and socks",
        Stivali: "Boots",
        "Scarpe basse": "Flat shoes",
        "Scarpe stringate": "Lace-up shoes",
        Mocassini: "Loafers",
        "Décolleté": "Pumps",
        Sandali: "Sandals",
        Sneaker: "Sneakers",
        Pochette: "Clutches",
        "Borse a tracolla": "Crossbody bags",
        Valigie: "Luggage",
        "Borse a spalla": "Shoulder bags",
        "Borse tote": "Tote bags",
        Cinture: "Belts",
        Braccialetti: "Bracelets",
        Orecchini: "Earrings",
        Occhiali: "Glasses",
        Guanti: "Gloves",
        Cappelli: "Hats",
        Collane: "Necklaces",
        Anelli: "Rings",
        Sciarpe: "Scarves",
        "Occhiali da sole": "Sunglasses",
        Portafogli: "Wallets",
      },
      conditions: EMAIL_COPY.en.conditions,
      measurements: {
        spalle: "Shoulders",
        petto: "Chest (flat)",
        vita: "Waist (flat)",
        fianchi: "Hips",
        collo: "Collar",
        manica: "Sleeve",
        lunghezza: "Length",
        lunghezzaTotale: "Total length",
        cavallo: "Rise",
        coscia: "Thigh",
        fondoGamba: "Leg opening",
        suolaInterna: "Insole length",
        larghezza: "Width",
        altezza: "Height",
        altezzaTacco: "Heel height",
        profondita: "Depth",
        tracolla: "Strap drop",
      },
      sizeValues: { "Taglia unica": "One size" },
    },
  },
} as const satisfies Record<Language, SiteCopy>;
