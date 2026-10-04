import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import { getCopy } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.pages.sell };
}

export default async function VendiConNoiPage() {
  const copy = await getCopy();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="border-b pb-8">
        <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
          {copy.sell.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground sm:text-base sm:leading-8">
          {copy.sell.lead}
        </p>
        <a
          href="https://wa.me/393884228100"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 px-8 tracking-[0.15em] uppercase")}
        >
          {copy.sell.cta}
        </a>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {copy.sell.steps.map((step, index) => (
          <div key={step.heading} className="border p-6">
            <span className="font-heading text-3xl text-muted-foreground">{index + 1}</span>
            <h3 className="mt-3 text-xs font-medium tracking-[0.15em] text-foreground uppercase">
              {step.heading}
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground">{step.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 space-y-3 border-t pt-8">
        <h2 className="text-lg font-medium tracking-[0.12em] text-foreground uppercase">
          {copy.sell.whatWeBuyTitle}
        </h2>
        <p className="text-sm leading-7 text-foreground sm:text-base sm:leading-8">
          {copy.sell.whatWeBuy}
        </p>
      </section>
    </main>
  );
}
