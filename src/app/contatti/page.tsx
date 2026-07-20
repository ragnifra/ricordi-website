import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contatti",
};

export default function ContattiPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <h1 className="border-b pb-6 text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
        Contatti
      </h1>

      <p className="mt-8 text-sm leading-7 text-foreground sm:text-base sm:leading-8">
        Hai domande, vuoi vendere un pezzo o richiedere informazioni su un articolo del catalogo?
        Scrivici o chiamaci: siamo qui per aiutarti.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href="mailto:ricordiarchive@hotmail.com"
          className="group flex min-h-[44px] flex-col justify-center gap-1.5 border p-6 transition-colors hover:bg-muted"
        >
          <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
            Email
          </span>
          <span className="text-sm break-all text-foreground underline-offset-4 group-hover:underline">
            ricordiarchive@hotmail.com
          </span>
        </a>

        <a
          href="tel:+393884228100"
          className="group flex min-h-[44px] flex-col justify-center gap-1.5 border p-6 transition-colors hover:bg-muted"
        >
          <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
            Telefono
          </span>
          <span className="text-sm text-foreground underline-offset-4 group-hover:underline sm:text-base">
            +39 388 422 8100
          </span>
        </a>
      </div>
    </main>
  );
}
