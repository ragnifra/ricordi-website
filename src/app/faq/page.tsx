import type { Metadata } from "next";
import Link from "next/link";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.pages.faq };
}

export default async function FaqPage() {
  const copy = await getCopy();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
          {copy.faq.title}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{copy.faq.intro}</p>
      </div>

      <div className="mt-8">
        <FaqAccordion items={copy.faq.items} />
      </div>

      <p className="mt-10 border-t pt-6 text-sm text-muted-foreground sm:text-base">
        {copy.faq.notFoundBefore}
        <Link
          href="/contatti"
          className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          {copy.faq.notFoundLink}
        </Link>
        {copy.faq.notFoundAfter}
      </p>
    </main>
  );
}
