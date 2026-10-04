"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { useCopy } from "@/components/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import type { PageId } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const NAV_LINKS: readonly { href: string; page: PageId }[] = [
  { href: "/catalogo", page: "catalog" },
  { href: "/chi-siamo", page: "about" },
  { href: "/vendi-con-noi", page: "sell" },
  { href: "/faq", page: "faq" },
  { href: "/contatti", page: "contact" },
];

// Switching language re-renders the current route, and re-rendering the
// checkout page would call createCheckoutSession again (a new reservation and
// a new Stripe session) — so the toggle is not offered there. The language
// chosen before checkout carries through.
const CHECKOUT_PATH = /^\/prodotto\/[^/]+\/checkout\/?$/;

// On the home page the header turns solid once the page has scrolled past this.
const SOLID_AFTER_SCROLL_PX = 32;

// Passive and rAF-throttled: at most one store check per frame.
function subscribeScroll(onChange: () => void) {
  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
  };
}

export function SiteHeader() {
  const pathname = usePathname();
  const copy = useCopy();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Re-read on hydration and on the scroll event a restored position fires,
  // so a reload halfway down the page doesn't stay transparent.
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > SOLID_AFTER_SCROLL_PX,
    () => false
  );

  // The admin area is a private tool, not part of the public site — it has
  // its own chrome (see the protected admin layout) and must not show this nav.
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Home only: the header overlays the hero photo (the hero pulls itself up
  // under it with -mt-16) and goes solid on scroll or while a menu is open.
  const transparent = pathname === "/" && !scrolled && !menuOpen && !searchOpen;

  return (
    <header
      className={cn(
        // Three columns, the outer two equal: the logo stays exactly centred
        // however wide the right-hand cluster (toggle + search) gets.
        "sticky top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b px-4 transition-[background-color,border-color] duration-300",
        transparent ? "border-transparent bg-transparent" : "bg-background"
      )}
    >
      {/* Keeps the icons and logo legible over the brightest hero photos. It
          hangs below the header for a soft edge, so it must fade out when the
          header is solid or it would darken the content underneath. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-linear-to-b from-background/80 to-transparent transition-opacity duration-300",
          transparent ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="justify-self-start">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="size-11" aria-label={copy.header.openMenu} />}
        >
          <ListIcon className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" closeLabel={copy.close} className="gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-xs font-medium tracking-[0.15em] uppercase">
              {copy.header.menuTitle}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col px-4">
            {NAV_LINKS.map((link) => (
              <SheetClose key={link.href} nativeButton={false} render={<Link href={link.href} />}>
                <span className="block border-b py-3.5 text-xs font-medium tracking-[0.15em] text-foreground uppercase transition-colors hover:text-muted-foreground">
                  {copy.pages[link.page]}
                </span>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      </div>

      <Link href="/" aria-label={copy.header.homeLabel} className="flex items-center">
        <Image
          src="/logo/logo-removebg-preview.png"
          alt="Ricordi Archive"
          width={36}
          height={36}
          priority
          className="h-9 w-9 object-contain"
        />
      </Link>

      <div className="flex items-center justify-self-end">
        {!CHECKOUT_PATH.test(pathname ?? "") && <LanguageToggle />}
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={copy.header.search}
          onClick={() => setSearchOpen(true)}
        >
          <MagnifyingGlassIcon className="size-5" />
        </Button>

        <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </header>
  );
}
