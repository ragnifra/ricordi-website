// Language of the public site: which ones exist, the preference cookie, and
// how a first visit is decided. Pure — no Next.js or server-only imports, so
// both the server helpers and client components can use it.
//
// First visit (no cookie): Italian if Italian appears anywhere in the
// browser's Accept-Language list, or the header is absent; English otherwise.
// Crawlers always get Italian, so Italian is what gets indexed. There is no
// IP geolocation on purpose: language is a preference, location is a poor
// proxy for it (an English speaker in Italy, an Italian abroad), and a geo-IP
// lookup would add personal-data processing for no gain.

export const LANGUAGES = ["it", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "it";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

// First-party, set only when the visitor presses the IT | EN toggle — a first
// visit sets nothing. Listed in the cookie policy: keep name and lifetime in
// sync with it.
export const LANGUAGE_COOKIE = "ricordi_lang";
export const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Search engines and link-preview fetchers. Googlebot sends no
// Accept-Language (so it would get Italian anyway); others may send en-US.
const CRAWLER_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && CRAWLER_PATTERN.test(userAgent);
}

// "it-IT,it;q=0.9,en;q=0.8" → Italian. An entry with q=0 means "not
// acceptable" and is ignored; "*" means any language, so the default applies.
export function pickLanguageFromAcceptLanguage(header: string | null | undefined): Language {
  const entries = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { primary: tag.trim().toLowerCase().split("-")[0], q: Number.isNaN(q) ? 1 : q };
    })
    .filter((entry) => entry.primary && entry.q > 0);

  if (entries.length === 0) return DEFAULT_LANGUAGE;
  if (entries.some((entry) => entry.primary === "it" || entry.primary === "*")) return "it";
  return "en";
}
