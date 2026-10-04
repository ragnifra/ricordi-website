import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  isCrawler,
  isLanguage,
  pickLanguageFromAcceptLanguage,
  type Language,
} from "@/lib/i18n/config";
import { SITE_COPY, type SiteCopy } from "@/lib/i18n/dictionary";

// The language of this request. The toggle's cookie wins; without it,
// crawlers get Italian and everyone else gets the Accept-Language rule (see
// src/lib/i18n/config.ts). Reading cookies/headers makes every route that
// renders the root layout dynamic — accepted, see AGENTS.md.
export const getLanguage = cache(async (): Promise<Language> => {
  const stored = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(stored)) return stored;

  const requestHeaders = await headers();
  if (isCrawler(requestHeaders.get("user-agent"))) return DEFAULT_LANGUAGE;
  return pickLanguageFromAcceptLanguage(requestHeaders.get("accept-language"));
});

export async function getCopy(): Promise<SiteCopy> {
  return SITE_COPY[await getLanguage()];
}
