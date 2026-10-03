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
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/catalogo", label: "Catalogo" },
  { href: "/chi-siamo", label: "Chi Siamo" },
  { href: "/vendi-con-noi", label: "Vendi con noi" },
  { href: "/faq", label: "FAQ" },
  { href: "/contatti", label: "Contatti" },
];

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
        "sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 transition-[background-color,border-color] duration-300",
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
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="size-11" aria-label="Apri menu" />}
        >
          <ListIcon className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-xs font-medium tracking-[0.15em] uppercase">Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col px-4">
            {NAV_LINKS.map((link) => (
              <SheetClose key={link.href} nativeButton={false} render={<Link href={link.href} />}>
                <span className="block border-b py-3.5 text-xs font-medium tracking-[0.15em] text-foreground uppercase transition-colors hover:text-muted-foreground">
                  {link.label}
                </span>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <Link href="/" aria-label="Ricordi Archive — home" className="flex items-center">
        <Image
          src="/logo/logo-removebg-preview.png"
          alt="Ricordi Archive"
          width={36}
          height={36}
          priority
          className="h-9 w-9 object-contain"
        />
      </Link>

      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="Cerca"
        onClick={() => setSearchOpen(true)}
      >
        <MagnifyingGlassIcon className="size-5" />
      </Button>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
