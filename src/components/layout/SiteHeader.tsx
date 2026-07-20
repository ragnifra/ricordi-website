"use client";

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

const NAV_LINKS = [
  { href: "/catalogo", label: "Catalogo" },
  { href: "/chi-siamo", label: "Chi Siamo" },
  { href: "/vendi-con-noi", label: "Vendi con noi" },
  { href: "/faq", label: "FAQ" },
  { href: "/contatti", label: "Contatti" },
];

export function SiteHeader() {
  const pathname = usePathname();

  // The admin area is a private tool, not part of the public site — it has
  // its own chrome (see the protected admin layout) and must not show this nav.
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4">
      <Sheet>
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

      <Button variant="ghost" size="icon" className="size-11" aria-label="Cerca">
        <MagnifyingGlassIcon className="size-5" />
      </Button>
    </header>
  );
}
