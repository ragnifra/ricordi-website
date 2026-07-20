import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/chi-siamo", label: "Chi Siamo" },
  { href: "/vendi-con-noi", label: "Vendi con noi" },
  { href: "/faq", label: "FAQ" },
  { href: "/contatti", label: "Contatti" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium tracking-[0.15em] text-foreground uppercase">
            Ricordi Archive
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:gap-6">
          <a
            href="mailto:ricordiarchive@hotmail.com"
            className="text-xs tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground"
          >
            ricordiarchive@hotmail.com
          </a>
          <a
            href="https://wa.me/393884228100"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
