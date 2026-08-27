// The product taxonomy: gender, category, and the three profile sets every
// category maps onto (size scale, garment measurements, parcel defaults).
//
// One entry per category in CATEGORIES below is the whole contract — adding a
// category is a single line there, and the `satisfies` clause makes omitting
// any of its four mappings a compile error. Department is derived from the
// category rather than stored: no category name is used by two departments, so
// the column would only be a second source of truth.
//
// Client-importable on purpose — no server-only imports here.

export const GENDER_OPTIONS = ["Uomo", "Donna"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export function isGender(value: string): value is Gender {
  return (GENDER_OPTIONS as readonly string[]).includes(value);
}

export const DEPARTMENT_OPTIONS = ["Abbigliamento", "Scarpe", "Borse", "Accessori"] as const;
export type Department = (typeof DEPARTMENT_OPTIONS)[number];

// --- Size scales -------------------------------------------------------
//
// Sizes are plain strings stored verbatim in products.size, so a scale can be
// edited here without a migration: a product whose size is no longer part of
// its scale still renders (see buildSizeRun in src/lib/product-sizes.ts), it
// just can't be picked again for a new product.

export type SizeScale = {
  id: string;
  // Shown next to the size picker in the admin form.
  label: string;
  sizes: readonly string[];
};

function numericRange(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}

export const SIZE_SCALES = {
  alphaUomo: {
    id: "alphaUomo",
    label: "Taglie alfabetiche (uomo)",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  alphaDonna: {
    id: "alphaDonna",
    label: "Taglie alfabetiche (donna)",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  pantaloniUomoIT: {
    id: "pantaloniUomoIT",
    label: "Taglia IT (uomo)",
    sizes: ["44", "46", "48", "50", "52", "54"],
  },
  // 37 is deliberately absent: denim is not tagged in that waist.
  jeansUomoUS: {
    id: "jeansUomoUS",
    label: "Vita US (uomo)",
    sizes: [...numericRange(28, 36), "38"],
  },
  pantaloniDonnaIT: {
    id: "pantaloniDonnaIT",
    label: "Taglia IT (donna)",
    sizes: ["38", "40", "42", "44", "46", "48"],
  },
  jeansDonnaUS: {
    id: "jeansDonnaUS",
    label: "Vita US (donna)",
    sizes: numericRange(24, 33),
  },
  // Wider than the conversion chart in src/lib/size-guide.ts, on purpose: the
  // chart is a reference for the sizes people actually convert between, this
  // is the range that can be listed.
  scarpeEU: {
    id: "scarpeEU",
    label: "Numero (EU)",
    sizes: numericRange(35, 47),
  },
  // Bags and accessories are still one physical piece each — they just have a
  // single size value, so the product page renders a one-entry run instead of
  // a size grid.
  tagliaUnica: {
    id: "tagliaUnica",
    label: "Taglia unica",
    sizes: ["Taglia unica"],
  },
} as const satisfies Record<string, SizeScale>;

export type SizeScaleId = keyof typeof SIZE_SCALES;

// --- Garment measurements ----------------------------------------------
//
// Measurements are stored in products.measurements (jsonb) keyed by the field
// ids below, never by their labels — relabelling a field here must never
// orphan the values already saved against it.

export const MEASUREMENT_FIELDS = {
  spalle: "Spalle",
  petto: "Petto (piatto)",
  vita: "Vita (piatta)",
  fianchi: "Fianchi",
  collo: "Collo",
  manica: "Manica",
  lunghezza: "Lunghezza",
  lunghezzaTotale: "Lunghezza totale",
  cavallo: "Cavallo",
  coscia: "Coscia",
  fondoGamba: "Fondo gamba",
  suolaInterna: "Lunghezza suola interna",
  larghezza: "Larghezza",
  altezza: "Altezza",
  altezzaTacco: "Altezza tacco",
  profondita: "Profondità",
  tracolla: "Tracolla",
} as const satisfies Record<string, string>;

export type MeasurementFieldId = keyof typeof MEASUREMENT_FIELDS;

export function isMeasurementFieldId(value: string): value is MeasurementFieldId {
  return Object.hasOwn(MEASUREMENT_FIELDS, value);
}

export const MEASUREMENT_PROFILES = {
  top: ["spalle", "petto", "lunghezza", "manica"],
  camicia: ["collo", "spalle", "petto", "manica", "lunghezza"],
  capospalla: ["spalle", "petto", "lunghezza", "manica"],
  bottom: ["vita", "cavallo", "lunghezzaTotale", "coscia", "fondoGamba"],
  // The union of top and bottom, for a category that can be either half of an
  // outfit (or both). Every field is optional, so the listing only carries the
  // ones that apply to the actual piece.
  topBottom: [
    "spalle",
    "petto",
    "lunghezza",
    "manica",
    "vita",
    "cavallo",
    "lunghezzaTotale",
    "coscia",
    "fondoGamba",
  ],
  shorts: ["vita", "cavallo", "lunghezzaTotale", "coscia"],
  abito: ["spalle", "petto", "vita", "lunghezzaTotale"],
  gonna: ["vita", "fianchi", "lunghezza"],
  scarpa: ["suolaInterna", "larghezza", "altezzaTacco"],
  borsa: ["larghezza", "altezza", "profondita", "tracolla"],
  // Accessories have no fixed set worth prompting for.
  nessuno: [],
} as const satisfies Record<string, readonly MeasurementFieldId[]>;

export type MeasurementProfileId = keyof typeof MEASUREMENT_PROFILES;

// --- Parcel defaults ---------------------------------------------------
//
// These describe the PARCEL, not the garment. They only need to be roughly
// right: getShippingRate and create-shipment.ts feed them to the carrier,
// which prices on a weight bracket. Always overridable in the admin form.

export type ParcelProfile = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export const PARCEL_PROFILES = {
  leggero: { weightGrams: 300, lengthCm: 30, widthCm: 25, heightCm: 5 },
  medio: { weightGrams: 700, lengthCm: 35, widthCm: 28, heightCm: 8 },
  pesante: { weightGrams: 1200, lengthCm: 40, widthCm: 30, heightCm: 12 },
  compatto: { weightGrams: 400, lengthCm: 30, widthCm: 25, heightCm: 6 },
  calzatura: { weightGrams: 1100, lengthCm: 35, widthCm: 25, heightCm: 14 },
  borsa: { weightGrams: 900, lengthCm: 40, widthCm: 30, heightCm: 15 },
  minuto: { weightGrams: 300, lengthCm: 25, widthCm: 20, heightCm: 8 },
} as const satisfies Record<string, ParcelProfile>;

export type ParcelProfileId = keyof typeof PARCEL_PROFILES;

// --- Categories --------------------------------------------------------

// Which genders offer a category, and on which scale. A category has to be
// offered under at least one gender — an empty object satisfies no member of
// this union, so "listed but unreachable" is a compile error.
type CategoryGenderScales =
  | { Uomo: SizeScaleId }
  | { Donna: SizeScaleId }
  | { Uomo: SizeScaleId; Donna: SizeScaleId };

type CategoryDef = {
  department: Department;
  sizes: CategoryGenderScales;
  measurements: MeasurementProfileId;
  parcel: ParcelProfileId;
};

// Declaration order is the order the admin dropdown offers them in. It is a
// single order that reproduces both gender orders exactly once filtered, so
// there is no second list to keep in sync.
export const CATEGORIES = {
  // ABBIGLIAMENTO
  "Abbigliamento sportivo": { department: "Abbigliamento", sizes: { Uomo: "alphaUomo" }, measurements: "topBottom", parcel: "medio" },
  Cappotti: { department: "Abbigliamento", sizes: { Uomo: "alphaUomo", Donna: "alphaDonna" }, measurements: "capospalla", parcel: "pesante" },
  Abiti: { department: "Abbigliamento", sizes: { Donna: "alphaDonna" }, measurements: "abito", parcel: "medio" },
  Giacche: { department: "Abbigliamento", sizes: { Uomo: "alphaUomo", Donna: "alphaDonna" }, measurements: "capospalla", parcel: "pesante" },
  Jeans: { department: "Abbigliamento", sizes: { Uomo: "jeansUomoUS", Donna: "jeansDonnaUS" }, measurements: "bottom", parcel: "medio" },
  Tute: { department: "Abbigliamento", sizes: { Donna: "alphaDonna" }, measurements: "abito", parcel: "medio" },
  "Maglieria e maglioni": { department: "Abbigliamento", sizes: { Uomo: "alphaUomo", Donna: "alphaDonna" }, measurements: "top", parcel: "medio" },
  Lingerie: { department: "Abbigliamento", sizes: { Donna: "alphaDonna" }, measurements: "top", parcel: "leggero" },
  Pantaloni: { department: "Abbigliamento", sizes: { Uomo: "pantaloniUomoIT", Donna: "pantaloniDonnaIT" }, measurements: "bottom", parcel: "medio" },
  Polo: { department: "Abbigliamento", sizes: { Uomo: "alphaUomo" }, measurements: "top", parcel: "leggero" },
  Pantaloncini: { department: "Abbigliamento", sizes: { Uomo: "pantaloniUomoIT", Donna: "pantaloniDonnaIT" }, measurements: "shorts", parcel: "compatto" },
  Gonne: { department: "Abbigliamento", sizes: { Donna: "alphaDonna" }, measurements: "gonna", parcel: "medio" },
  Top: { department: "Abbigliamento", sizes: { Donna: "alphaDonna" }, measurements: "top", parcel: "leggero" },
  Camicie: { department: "Abbigliamento", sizes: { Uomo: "alphaUomo" }, measurements: "camicia", parcel: "medio" },
  Completi: { department: "Abbigliamento", sizes: { Uomo: "pantaloniUomoIT" }, measurements: "capospalla", parcel: "pesante" },
  "Costumi da bagno": { department: "Abbigliamento", sizes: { Uomo: "alphaUomo" }, measurements: "shorts", parcel: "leggero" },
  "T-shirt e gilet": { department: "Abbigliamento", sizes: { Uomo: "alphaUomo" }, measurements: "top", parcel: "leggero" },
  "Intimo e calze": { department: "Abbigliamento", sizes: { Uomo: "alphaUomo" }, measurements: "nessuno", parcel: "leggero" },

  // SCARPE
  Stivali: { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },
  "Scarpe basse": { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },
  "Scarpe stringate": { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },
  Mocassini: { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },
  "Décolleté": { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },
  Sandali: { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },
  Sneaker: { department: "Scarpe", sizes: { Uomo: "scarpeEU", Donna: "scarpeEU" }, measurements: "scarpa", parcel: "calzatura" },

  // BORSE
  Pochette: { department: "Borse", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "borsa", parcel: "borsa" },
  "Borse a tracolla": { department: "Borse", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "borsa", parcel: "borsa" },
  Valigie: { department: "Borse", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "borsa", parcel: "borsa" },
  "Borse a spalla": { department: "Borse", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "borsa", parcel: "borsa" },
  "Borse tote": { department: "Borse", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "borsa", parcel: "borsa" },

  // ACCESSORI
  Cinture: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Braccialetti: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Orecchini: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Occhiali: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Guanti: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Cappelli: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Collane: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Anelli: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Sciarpe: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  "Occhiali da sole": { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
  Portafogli: { department: "Accessori", sizes: { Uomo: "tagliaUnica", Donna: "tagliaUnica" }, measurements: "nessuno", parcel: "minuto" },
} as const satisfies Record<string, CategoryDef>;

export type Category = keyof typeof CATEGORIES;

export const CATEGORY_OPTIONS = Object.keys(CATEGORIES) as Category[];

export function isCategory(value: string): value is Category {
  return Object.hasOwn(CATEGORIES, value);
}

function categoryDef(category: string): CategoryDef | null {
  return isCategory(category) ? CATEGORIES[category] : null;
}

// --- Lookups -----------------------------------------------------------
//
// Everything below takes plain strings, not the narrowed types: values coming
// out of the database predate the current taxonomy and may not be in it any
// more, and a legacy row still has to render.

export function getDepartment(category: string): Department | null {
  return categoryDef(category)?.department ?? null;
}

// The (gender, category) pair is what identifies a valid selection — a
// category exists only for the genders that list a scale for it.
export function isValidCategoryForGender(gender: string, category: string): boolean {
  if (!isGender(gender)) return false;
  const def = categoryDef(category);
  return def ? gender in def.sizes : false;
}

export function getCategoriesForGender(gender: Gender): Category[] {
  return CATEGORY_OPTIONS.filter((category) => gender in CATEGORIES[category].sizes);
}

export type CategoryGroup = {
  department: Department;
  categories: Category[];
};

// Categories grouped by their department, for the admin dropdown. Departments
// keep DEPARTMENT_OPTIONS order; categories keep declaration order.
export function getCategoryGroupsForGender(gender: Gender): CategoryGroup[] {
  const available = getCategoriesForGender(gender);

  return DEPARTMENT_OPTIONS.map((department) => ({
    department,
    categories: available.filter((category) => CATEGORIES[category].department === department),
  })).filter((group) => group.categories.length > 0);
}

export function getSizeScaleId(gender: string, category: string): SizeScaleId | null {
  if (!isGender(gender)) return null;
  const def = categoryDef(category);
  if (!def) return null;
  // The union member a given category uses isn't known statically, so the
  // per-gender lookup is expressed as the partial record it behaves like.
  return (def.sizes as Partial<Record<Gender, SizeScaleId>>)[gender] ?? null;
}

export function getSizeScale(gender: string, category: string): SizeScale | null {
  const scaleId = getSizeScaleId(gender, category);
  return scaleId ? SIZE_SCALES[scaleId] : null;
}

export function getMeasurementFields(category: string): readonly MeasurementFieldId[] {
  const def = categoryDef(category);
  return def ? MEASUREMENT_PROFILES[def.measurements] : [];
}

export function getParcelDefaults(category: string): ParcelProfile | null {
  const def = categoryDef(category);
  return def ? PARCEL_PROFILES[def.parcel] : null;
}
