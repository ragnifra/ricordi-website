import {
  getMeasurementFields,
  isGender,
  isValidCategoryForGender,
  type MeasurementFieldId,
} from "@/lib/taxonomy";
import {
  isValidMeasurement,
  MAX_MEASUREMENT_CM,
  type Measurements,
} from "@/lib/product-measurements";
import { normalizeLineBreaks } from "@/lib/rich-text";

export const MAX_IMAGE_FILES = 10;

// What ends up in Storage, after src/lib/image-compression.ts has run. Mirrored
// by the bucket's own file_size_limit (see the restrict_product_images_bucket
// migration), which is the limit that actually stops a bad upload now that the
// browser writes to Storage directly.
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

// What the picker accepts as input. Higher than the stored limit because the
// browser compresses before uploading — a 20MB camera original is fine, it just
// never reaches Storage at that size.
export const MAX_SOURCE_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;

// Ceiling on one batch of selected files, before compression. Guards the
// browser's memory while decoding, not the network — nothing this large is ever
// uploaded.
export const MAX_TOTAL_SOURCE_IMAGE_SIZE_BYTES = 80 * 1024 * 1024;

export const PRODUCT_IMAGES_BUCKET = "product-images";

// Browser uploads land here under a server-minted random name, and stay until a
// submission attaches them to a product (see cleanupOrphanUploads for the ones
// that never do). Images created before direct upload live at the bucket root
// under slug-derived names and are untouched by any of this.
export const UPLOAD_PATH_PREFIX = "uploads";

// The exact shape createUploadSlots mints, and the only shape the actions
// accept back from a submission. The client never picks a path; this is what
// makes sure it cannot start.
export const UPLOAD_PATH_PATTERN =
  /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const CONDITION_OPTIONS = [
  "Nuovo con cartellino",
  "Come nuovo",
  "Ottime condizioni",
  "Buone condizioni",
] as const;
export type Condition = (typeof CONDITION_OPTIONS)[number];

// Free text, so only length is enforced — "80% lana, 20% cashmere" and
// "100% cotone" are both fine, and so is anything else the piece's label says.
export const MAX_COMPOSITION_LENGTH = 200;

export function isAllowedImageMimeType(type: string): type is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export function imageExtensionForMimeType(type: string): string {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error(`Unsupported image MIME type: ${type}`);
  }
}

export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// "multi" is the create form, which picks several sizes at once and creates
// one product row per size; "single" is the edit form, which works on one
// existing row. Only the category/size part of the form differs.
export type ProductFormMode = "single" | "multi";

// Shared shape submitted by both the "new product" and "edit product" forms —
// everything except images and (for edit) the id, which the two actions
// thread through differently.
export type ProductFormValues = {
  brand: string;
  name: string;
  gender: string;
  category: string;
  size: string;
  condition: string;
  price: string;
  cost: string;
  composition: string;
  description: string;
  authenticityNotes: string;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  // Raw strings keyed by measurement field id, so a rejected submission can be
  // redisplayed exactly as it was typed.
  measurements: Record<string, string>;
};

// "sizes" (plural) is the multi-size picker on the create form, which submits
// its own `sizes` entries instead of the single `size` field — see
// buildSizeVariants below.
export type ProductFormFieldErrors = Partial<
  Record<keyof ProductFormValues | "images" | "sizes", string>
>;

export type ProductFormState = {
  error: string | null;
  fieldErrors: ProductFormFieldErrors;
  values: ProductFormValues;
};

export const EMPTY_PRODUCT_FORM_VALUES: ProductFormValues = {
  brand: "",
  name: "",
  gender: "",
  category: "",
  size: "",
  condition: "",
  price: "",
  cost: "",
  composition: "",
  description: "",
  authenticityNotes: "",
  weightGrams: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  measurements: {},
};

// --- Measurements ------------------------------------------------------
//
// Field names carry the field id, never the label, so the same key the value
// is stored under is the one the form round-trips it on.

export function measurementFieldName(field: MeasurementFieldId): string {
  return `measurement__${field}`;
}

// Per-size measurements on the create form: a 30 and a 34 of the same jeans
// have different waists, so these are entered per size and never copied.
export function sizeMeasurementFieldName(field: MeasurementFieldId, size: string): string {
  return `sizeMeasurement__${field}__${size}`;
}

function readRawMeasurements(
  formData: FormData,
  fields: readonly MeasurementFieldId[],
  toName: (field: MeasurementFieldId) => string
): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(toName(field)) ?? "").trim();
    if (value) raw[field] = value;
  }
  return raw;
}

export type ParsedMeasurements =
  | { ok: true; measurements: Measurements | null }
  | { ok: false; error: string };

// Only the fields the category's profile prompts for are accepted — a value
// submitted for any other field id is ignored rather than stored, so a
// tampered form can't write arbitrary keys into the jsonb column.
function parseMeasurements(
  raw: Record<string, string>,
  fields: readonly MeasurementFieldId[]
): ParsedMeasurements {
  const measurements: Measurements = {};

  for (const field of fields) {
    const value = raw[field];
    if (!value) continue;

    const parsed = Number(value.replace(",", "."));
    if (!isValidMeasurement(parsed)) {
      return { ok: false, error: `Inserisci una misura valida (0-${MAX_MEASUREMENT_CM} cm).` };
    }

    measurements[field] = parsed;
  }

  return {
    ok: true,
    measurements: Object.keys(measurements).length > 0 ? measurements : null,
  };
}

export function readProductFormValues(formData: FormData): ProductFormValues {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  // Line breaks in the free-text fields are the author's layout, so they are
  // preserved verbatim — only the CRLF a form submission introduces is
  // normalised away, so what is stored matches what was typed.
  const readMultiline = (key: string) => normalizeLineBreaks(read(key));

  const category = read("category");

  return {
    brand: read("brand"),
    name: read("name"),
    gender: read("gender"),
    category,
    size: read("size"),
    condition: read("condition"),
    price: read("price"),
    cost: read("cost"),
    composition: read("composition"),
    description: readMultiline("description"),
    authenticityNotes: readMultiline("authenticityNotes"),
    weightGrams: read("weightGrams"),
    lengthCm: read("lengthCm"),
    widthCm: read("widthCm"),
    heightCm: read("heightCm"),
    measurements: readRawMeasurements(formData, getMeasurementFields(category), measurementFieldName),
  };
}

export type ParsedProductFields = {
  fieldErrors: ProductFormFieldErrors;
  price: number;
  cost: number | null;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  // Only meaningful in "single" mode — the create form collects one set of
  // measurements per size instead (see buildSizeVariants).
  measurements: Measurements | null;
};

export type ValidateProductFieldsOptions = {
  // createProduct submits a list of sizes instead of the single `size` field
  // (one product row per size), so it validates those itself and opts out of
  // the single-size check here.
  requireSize?: boolean;
  // Likewise, the create form's measurements are per-size and are parsed by
  // buildSizeVariants rather than here.
  requireMeasurements?: boolean;
};

// Pure field validation shared by createProduct and updateProduct. Image
// validation is handled separately (see validateImageFile below) since the
// two actions treat "how many / which images" differently.
export function validateProductFields(
  values: ProductFormValues,
  options?: ValidateProductFieldsOptions
): ParsedProductFields {
  const fieldErrors: ProductFormFieldErrors = {};

  if (!values.brand) fieldErrors.brand = "Campo obbligatorio.";
  if (!values.name) fieldErrors.name = "Campo obbligatorio.";
  if (options?.requireSize !== false && !values.size) fieldErrors.size = "Campo obbligatorio.";

  if (!isGender(values.gender)) {
    fieldErrors.gender = "Seleziona un genere.";
  }

  // The pair is what's validated, not the two fields independently: "Donna"
  // + "Camicie" names two things that exist and a combination that doesn't.
  if (!values.category) {
    fieldErrors.category = "Seleziona una categoria.";
  } else if (!fieldErrors.gender && !isValidCategoryForGender(values.gender, values.category)) {
    fieldErrors.category = "Categoria non valida per il genere selezionato.";
  }

  if (!values.condition || !(CONDITION_OPTIONS as readonly string[]).includes(values.condition)) {
    fieldErrors.condition = "Seleziona una condizione.";
  }

  if (values.composition.length > MAX_COMPOSITION_LENGTH) {
    fieldErrors.composition = `Massimo ${MAX_COMPOSITION_LENGTH} caratteri.`;
  }

  const price = Number(values.price.replace(",", "."));
  if (!values.price || !Number.isFinite(price) || price <= 0) {
    fieldErrors.price = "Inserisci un prezzo valido.";
  }

  let cost: number | null = null;
  if (values.cost) {
    const parsedCost = Number(values.cost.replace(",", "."));
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      fieldErrors.cost = "Inserisci un costo valido.";
    } else {
      cost = parsedCost;
    }
  }

  const weightGrams = Number(values.weightGrams);
  if (!values.weightGrams || !Number.isFinite(weightGrams) || weightGrams <= 0) {
    fieldErrors.weightGrams = "Inserisci un peso valido.";
  }

  const lengthCm = Number(values.lengthCm);
  if (!values.lengthCm || !Number.isFinite(lengthCm) || lengthCm <= 0) {
    fieldErrors.lengthCm = "Inserisci una lunghezza valida.";
  }

  const widthCm = Number(values.widthCm);
  if (!values.widthCm || !Number.isFinite(widthCm) || widthCm <= 0) {
    fieldErrors.widthCm = "Inserisci una larghezza valida.";
  }

  const heightCm = Number(values.heightCm);
  if (!values.heightCm || !Number.isFinite(heightCm) || heightCm <= 0) {
    fieldErrors.heightCm = "Inserisci un'altezza valida.";
  }

  let measurements: Measurements | null = null;
  if (options?.requireMeasurements !== false) {
    const parsed = parseMeasurements(values.measurements, getMeasurementFields(values.category));
    if (parsed.ok) {
      measurements = parsed.measurements;
    } else {
      fieldErrors.measurements = parsed.error;
    }
  }

  return {
    fieldErrors,
    price,
    cost,
    weightGrams,
    lengthCm,
    widthCm,
    heightCm,
    measurements,
  };
}

// --- Multi-size submissions (create form only) -------------------------
//
// The create form submits one `sizes` entry per selected size and creates one
// product row per size, all sharing a group_id. Everything else is entered
// once and shared, with an optional per-size override for the occasional
// piece where a size differs (a longer inseam weighing more, a size in worse
// condition priced lower, a size whose flaw needs describing and
// photographing). An override field left empty means "use the shared value".
//
// Measurements are the exception: they describe the individual garment, not
// the piece, so they're only ever entered per size and are never filled in
// from a shared value.
//
// Images follow the same empty-means-shared rule as the description, and
// override it the same way: a size that carries photos of its own shows only
// those (see sizeImagesFieldName below).

// Guard against a runaway submission — no real size run is longer than this,
// and every extra size is one more product row plus one more set of
// product_images rows.
export const MAX_SIZES_PER_SUBMISSION = 24;

export const SIZE_OVERRIDE_FIELDS = [
  "price",
  "condition",
  "description",
  "weightGrams",
  "lengthCm",
  "widthCm",
  "heightCm",
] as const;
export type SizeOverrideField = (typeof SIZE_OVERRIDE_FIELDS)[number];

// Shared by the form (input names) and the action (FormData lookups), so the
// two can never drift apart. Sizes come from a fixed scale
// (src/lib/taxonomy.ts), so they're safe to embed in a field name.
export function sizeOverrideFieldName(field: SizeOverrideField, size: string): string {
  return `sizeOverride__${field}__${size}`;
}

// The photos of one size — the piece with the flaw its siblings don't have.
// They REPLACE the shared upload for that size rather than being appended to
// it: a size is photographed separately precisely when the shared shoot does
// not show it, so following those photos with that shoot would misrepresent
// the piece. Leaving the picker empty means "use the shared photos", the same
// nothing-entered-nothing-changes rule the other overrides follow.
export function sizeImagesFieldName(size: string): string {
  return `sizeImages__${size}`;
}

// One product row's worth of values: the shared ones unless that size
// overrode them.
export type SizeVariant = {
  size: string;
  price: number;
  condition: string;
  description: string | null;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  measurements: Measurements | null;
};

export type SharedVariantValues = Omit<SizeVariant, "size" | "measurements">;

export function readSelectedSizes(formData: FormData): string[] {
  const seen = new Set<string>();
  for (const entry of formData.getAll("sizes")) {
    const size = String(entry ?? "").trim();
    if (size) seen.add(size);
  }
  return [...seen];
}

function readOverride(formData: FormData, field: SizeOverrideField, size: string): string {
  return String(formData.get(sizeOverrideFieldName(field, size)) ?? "").trim();
}

export type BuildSizeVariantsResult =
  | { ok: true; variants: SizeVariant[] }
  | { ok: false; error: string };

// Resolves the per-size overrides against the shared values. Validation
// mirrors validateProductFields field by field (same parsing, same bounds) so
// an overridden value can never be looser than a shared one.
export function buildSizeVariants(
  formData: FormData,
  sizes: string[],
  shared: SharedVariantValues,
  category: string
): BuildSizeVariantsResult {
  const variants: SizeVariant[] = [];
  const measurementFields = getMeasurementFields(category);

  for (const size of sizes) {
    const variant: SizeVariant = { size, ...shared, measurements: null };

    const rawPrice = readOverride(formData, "price", size);
    if (rawPrice) {
      const price = Number(rawPrice.replace(",", "."));
      if (!Number.isFinite(price) || price <= 0) {
        return { ok: false, error: `Taglia ${size}: inserisci un prezzo valido.` };
      }
      variant.price = price;
    }

    const rawCondition = readOverride(formData, "condition", size);
    if (rawCondition) {
      if (!(CONDITION_OPTIONS as readonly string[]).includes(rawCondition)) {
        return { ok: false, error: `Taglia ${size}: seleziona una condizione valida.` };
      }
      variant.condition = rawCondition;
    }

    // Line breaks are the author's layout here too, so the override is
    // normalised exactly like the shared description (see
    // readProductFormValues) rather than stored with whatever the submission
    // introduced.
    const rawDescription = normalizeLineBreaks(readOverride(formData, "description", size));
    if (rawDescription) {
      variant.description = rawDescription;
    }

    const measures = [
      { field: "weightGrams", label: "un peso valido" },
      { field: "lengthCm", label: "una lunghezza valida" },
      { field: "widthCm", label: "una larghezza valida" },
      { field: "heightCm", label: "un'altezza valida" },
    ] as const;

    for (const { field, label } of measures) {
      const raw = readOverride(formData, field, size);
      if (!raw) continue;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { ok: false, error: `Taglia ${size}: inserisci ${label}.` };
      }
      variant[field] = parsed;
    }

    const rawMeasurements = readRawMeasurements(formData, measurementFields, (field) =>
      sizeMeasurementFieldName(field, size)
    );
    const parsedMeasurements = parseMeasurements(rawMeasurements, measurementFields);

    if (!parsedMeasurements.ok) {
      return { ok: false, error: `Taglia ${size}: ${parsedMeasurements.error.toLowerCase()}` };
    }

    variant.measurements = parsedMeasurements.measurements;

    variants.push(variant);
  }

  return { ok: true, variants };
}

export type ImageRejection = { name: string; reason: string };

// Extensions worth attempting when the browser gives us no MIME type at all —
// some Android pickers and some drag sources do exactly that, and rejecting on
// an empty `file.type` was one of the ways a perfectly good photo used to
// disappear with "formato non supportato".
const PLAUSIBLE_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|hei[cf]|gif|bmp|tiff?|avif)$/i;

// Deliberately permissive about format: anything the browser calls an image is
// handed to compressImageFile, which either converts it to JPEG/WEBP or reports
// precisely why it could not. HEIC reaches that path on purpose — Safari
// decodes it, and the ones that cannot get a specific message instead of a
// generic rejection here.
//
// Format is then enforced where it can actually be trusted: on the compressor's
// output, in createUploadSlots, by the bucket's allowed_mime_types, and again in
// verifyUploadedImages against the stored object.
function isPlausibleImage(file: File): boolean {
  if (file.type) return file.type.toLowerCase().startsWith("image/");
  return PLAUSIBLE_IMAGE_EXTENSIONS.test(file.name);
}

// Client-side triage used by the drag & drop zone to give immediate feedback as
// files are added. `existing` carries both the count and the byte total already
// selected, so the caps hold across repeated drops rather than per drop.
export function partitionImageFiles(
  existing: { count: number; bytes: number },
  incoming: File[]
): { accepted: File[]; rejected: ImageRejection[] } {
  const accepted: File[] = [];
  const rejected: ImageRejection[] = [];
  let count = existing.count;
  let bytes = existing.bytes;

  for (const file of incoming) {
    if (count >= MAX_IMAGE_FILES) {
      rejected.push({ name: file.name, reason: `massimo ${MAX_IMAGE_FILES} immagini` });
      continue;
    }
    if (!isPlausibleImage(file)) {
      rejected.push({ name: file.name, reason: "non è un'immagine" });
      continue;
    }
    if (file.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
      rejected.push({
        name: file.name,
        reason: `supera ${formatFileSize(MAX_SOURCE_IMAGE_SIZE_BYTES)}`,
      });
      continue;
    }
    if (bytes + file.size > MAX_TOTAL_SOURCE_IMAGE_SIZE_BYTES) {
      rejected.push({ name: file.name, reason: "selezione troppo pesante" });
      continue;
    }
    accepted.push(file);
    count++;
    bytes += file.size;
  }

  return { accepted, rejected };
}

// --- Uploaded image paths ----------------------------------------------
//
// Since the browser uploads straight to Storage, a submission carries storage
// paths rather than files. Every path must be one this server minted (see
// createUploadSlots): the pattern check below is the first of three gates, the
// others being the existence/type check in verifyUploadedImages and the
// bucket's own limits.

export function parseImagePaths(raw: FormDataEntryValue | null): string[] | null {
  if (raw === null || raw === "") return [];
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const paths: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "string" || !UPLOAD_PATH_PATTERN.test(entry)) return null;
    // A repeated path would attach one storage object to two positions, and
    // deleting one would break the other.
    if (paths.includes(entry)) return null;
    paths.push(entry);
  }

  return paths;
}
