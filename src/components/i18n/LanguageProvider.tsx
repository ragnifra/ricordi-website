"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Language } from "@/lib/i18n/config";
import type { SiteCopy } from "@/lib/i18n/dictionary";

type LanguageContextValue = { lang: Language; copy: SiteCopy };

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Mounted once by the root layout with the request's language and that
// language's copy only — the dictionary module itself never reaches the
// client bundle, and the layout isn't re-sent on client navigation.
export function LanguageProvider({
  lang,
  copy,
  children,
}: {
  lang: Language;
  copy: SiteCopy;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ lang, copy }), [lang, copy]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageContext(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage/useCopy must be used within a LanguageProvider");
  return context;
}

export function useLanguage(): Language {
  return useLanguageContext().lang;
}

export function useCopy(): SiteCopy {
  return useLanguageContext().copy;
}
