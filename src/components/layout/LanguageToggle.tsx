"use client";

import { Fragment, useTransition } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { setLanguage } from "@/lib/i18n/actions";
import type { Language } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// Each option names itself in its own language, whatever the page language.
const OPTIONS: readonly { lang: Language; label: string; name: string }[] = [
  { lang: "it", label: "IT", name: "Italiano" },
  { lang: "en", label: "EN", name: "English" },
];

// IT | EN. Pressing one stores the choice in the ricordi_lang cookie (server
// action) and the current page re-renders in place: same URL, same scroll,
// same query string, nothing unmounted.
export function LanguageToggle() {
  const lang = useLanguage();
  const [isPending, startTransition] = useTransition();

  function choose(next: Language) {
    if (next === lang || isPending) return;
    startTransition(async () => {
      await setLanguage(next);
    });
  }

  return (
    <div
      role="group"
      aria-label="Lingua / Language"
      translate="no"
      className={cn("flex items-center transition-opacity", isPending && "opacity-60")}
    >
      {OPTIONS.map((option, index) => {
        const active = option.lang === lang;
        return (
          <Fragment key={option.lang}>
            {index > 0 && <span aria-hidden className="h-3 w-px bg-foreground/40" />}
            <button
              type="button"
              lang={option.lang}
              aria-label={option.name}
              aria-pressed={active}
              onClick={() => choose(option.lang)}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center text-xs font-medium tracking-[0.15em] uppercase transition-colors",
                active
                  ? "text-foreground underline underline-offset-[6px]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
