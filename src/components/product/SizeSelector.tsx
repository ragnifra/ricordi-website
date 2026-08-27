import Link from "next/link";

import type { SizeGroupMember } from "@/lib/catalog";
import { buildSizeRun } from "@/lib/product-sizes";
import { cn } from "@/lib/utils";

type SizeSelectorProps = {
  // The scale belongs to the gender+category pair, not to the category alone.
  gender: string;
  category: string;
  currentSlug: string;
  members: SizeGroupMember[];
};

const ENTRY_BASE =
  "flex h-11 min-w-11 items-center justify-center border px-3 text-xs tracking-[0.1em] uppercase";

function unavailableLabel(member: SizeGroupMember | null): string {
  if (!member) return "Taglia non disponibile";
  return member.status === "sold" ? "Venduto" : "Riservato";
}

// The full size run of a piece sold in several sizes: every size in the
// piece's scale, so the customer sees the run the way a normal store shows
// it. Only the sizes that exist and are still buyable link anywhere — each
// one is its own product page, with its own price and its own checkout.
export function SizeSelector({ gender, category, currentSlug, members }: SizeSelectorProps) {
  const run = buildSizeRun(gender, category, members);

  return (
    <ul className="flex flex-wrap gap-2">
      {run.map(({ size, member }) => {
        const isCurrent = member?.slug === currentSlug;
        const isSelectable = member?.status === "available" && !isCurrent;

        if (isCurrent) {
          return (
            <li key={size}>
              <span
                aria-current="true"
                className={cn(
                  ENTRY_BASE,
                  "border-foreground bg-foreground font-semibold text-background"
                )}
              >
                {size}
              </span>
            </li>
          );
        }

        if (isSelectable) {
          return (
            <li key={size}>
              <Link
                href={`/prodotto/${member.slug}`}
                className={cn(
                  ENTRY_BASE,
                  "border-border font-semibold text-foreground underline underline-offset-4 transition-colors hover:border-foreground"
                )}
              >
                {size}
              </Link>
            </li>
          );
        }

        return (
          <li key={size}>
            <span
              aria-disabled="true"
              title={unavailableLabel(member ?? null)}
              className={cn(ENTRY_BASE, "border-border/50 text-muted-foreground/50")}
            >
              {size}
              <span className="sr-only"> — {unavailableLabel(member ?? null)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
