import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/chi-siamo", label: "Chi Siamo" },
  { href: "/vendi-con-noi", label: "Vendi con noi" },
  { href: "/faq", label: "FAQ" },
  { href: "/contatti", label: "Contatti" },
];

// Grows each link's box to a 44px tap target while negative margins keep its
// layout footprint at the bare text, so the visible text doesn't move. The
// boxes spill 14px above/below and 10px either side: row gaps must stay >= 28px
// (gap-y-7) and column gaps >= 20px or neighbouring targets overlap.
const TAP_TARGET =
  "-mx-2.5 -my-3.5 inline-flex min-h-11 min-w-11 items-center justify-center px-2.5";

const LINK_CLASS = `${TAP_TARGET} text-xs font-medium tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground`;

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium tracking-[0.15em] text-foreground uppercase">
            Ricordi Archive
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-7">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={LINK_CLASS}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-start gap-7 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          <a
            href="mailto:ricordiarchive@hotmail.com"
            className={`${TAP_TARGET} text-xs tracking-wider text-muted-foreground transition-colors hover:text-foreground`}
          >
            ricordiarchive@hotmail.com
          </a>
          <a
            href="https://wa.me/393884228100"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            WhatsApp
          </a>
          <a
            href="https://www.iubenda.com/privacy-policy/52999084"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Privacy Policy
          </a>
          <a
            href="https://www.iubenda.com/privacy-policy/52999084/cookie-policy"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            Cookie Policy
          </a>
          <Link href="/termini-e-condizioni" className={LINK_CLASS}>
            Termini e Condizioni
          </Link>
        </div>

        <div className="flex flex-col gap-1 text-[11px] leading-5 tracking-wider text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
          <span>RICORDI ARCHIVE DI BARUFFI EDOARDO</span>
          <span>Sede legale: Via Corelli 36, 61122 Pesaro (PU)</span>
          <span>P.IVA 02862300411</span>
          <span>REA PS - 310441</span>
        </div>
      </div>
    </footer>
  );
}
