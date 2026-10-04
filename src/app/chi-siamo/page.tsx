import type { Metadata } from "next";

import { BrandText } from "@/components/i18n/BrandText";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.pages.about };
}

export default async function ChiSiamoPage() {
  const copy = await getCopy();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <h1 className="border-b pb-6 text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
        {copy.pages.about}
      </h1>

      {/* The active language only (IT/EN toggle in the header). BrandText
          keeps "Ricordi" from being translated as "memories". */}
      <div className="mt-8 space-y-6 text-sm leading-7 text-foreground sm:text-base sm:leading-8">
        {copy.about.paragraphs.map((paragraph) => (
          <p key={paragraph}>
            <BrandText text={paragraph} />
          </p>
        ))}
      </div>
    </main>
  );
}
