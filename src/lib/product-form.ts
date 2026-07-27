export const MAX_IMAGE_FILES = 10;
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const CATEGORY_OPTIONS = [
  "Pantaloni",
  "Giacche",
  "Maglieria",
  "Borse",
  "Accessori",
  "Camicie",
] as const;
export type Category = (typeof CATEGORY_OPTIONS)[number];

export const CONDITION_OPTIONS = [
  "Nuovo con cartellino",
  "Come nuovo",
  "Ottime condizioni",
  "Buone condizioni",
] as const;
export type Condition = (typeof CONDITION_OPTIONS)[number];

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

// Shared shape submitted by both the "new product" and "edit product" forms —
// everything except images and (for edit) the id, which the two actions
// thread through differently.
export type ProductFormValues = {
  brand: string;
  name: string;
  category: string;
  size: string;
  condition: string;
  price: string;
  cost: string;
  description: string;
  authenticityNotes: string;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

export type ProductFormFieldErrors = Partial<Record<keyof ProductFormValues | "images", string>>;

export type ProductFormState = {
  error: string | null;
  fieldErrors: ProductFormFieldErrors;
  values: ProductFormValues;
};

export const EMPTY_PRODUCT_FORM_VALUES: ProductFormValues = {
  brand: "",
  name: "",
  category: "",
  size: "",
  condition: "",
  price: "",
  cost: "",
  description: "",
  authenticityNotes: "",
  weightGrams: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
};

export function readProductFormValues(formData: FormData): ProductFormValues {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    brand: read("brand"),
    name: read("name"),
    category: read("category"),
    size: read("size"),
    condition: read("condition"),
    price: read("price"),
    cost: read("cost"),
    description: read("description"),
    authenticityNotes: read("authenticityNotes"),
    weightGrams: read("weightGrams"),
    lengthCm: read("lengthCm"),
    widthCm: read("widthCm"),
    heightCm: read("heightCm"),
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
};

// Pure field validation shared by createProduct and updateProduct. Image
// validation is handled separately (see validateImageFile below) since the
// two actions treat "how many / which images" differently.
export function validateProductFields(values: ProductFormValues): ParsedProductFields {
  const fieldErrors: ProductFormFieldErrors = {};

  if (!values.brand) fieldErrors.brand = "Campo obbligatorio.";
  if (!values.name) fieldErrors.name = "Campo obbligatorio.";
  if (!values.size) fieldErrors.size = "Campo obbligatorio.";

  if (!values.category || !(CATEGORY_OPTIONS as readonly string[]).includes(values.category)) {
    fieldErrors.category = "Seleziona una categoria.";
  }

  if (!values.condition || !(CONDITION_OPTIONS as readonly string[]).includes(values.condition)) {
    fieldErrors.condition = "Seleziona una condizione.";
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

  return { fieldErrors, price, cost, weightGrams, lengthCm, widthCm, heightCm };
}

// Per-file validation shared by both actions' upload loops. Returns an error
// message, or undefined if the file is fine.
export function validateImageFile(file: File): string | undefined {
  if (!isAllowedImageMimeType(file.type)) {
    return `Formato non supportato (${file.name}). Usa JPEG, PNG o WEBP.`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `${file.name} supera ${formatFileSize(MAX_IMAGE_SIZE_BYTES)}.`;
  }
  return undefined;
}

export type ImageRejection = { name: string; reason: string };

// Client-side triage used by the drag & drop zone to give immediate feedback
// as files are added. The server action re-validates independently — this
// never substitutes for that check.
export function partitionImageFiles(
  existingCount: number,
  incoming: File[]
): { accepted: File[]; rejected: ImageRejection[] } {
  const accepted: File[] = [];
  const rejected: ImageRejection[] = [];
  let count = existingCount;

  for (const file of incoming) {
    if (count >= MAX_IMAGE_FILES) {
      rejected.push({ name: file.name, reason: `massimo ${MAX_IMAGE_FILES} immagini` });
      continue;
    }
    if (!isAllowedImageMimeType(file.type)) {
      rejected.push({ name: file.name, reason: "formato non supportato" });
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      rejected.push({ name: file.name, reason: `supera ${formatFileSize(MAX_IMAGE_SIZE_BYTES)}` });
      continue;
    }
    accepted.push(file);
    count++;
  }

  return { accepted, rejected };
}
