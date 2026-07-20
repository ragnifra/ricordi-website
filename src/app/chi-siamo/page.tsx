import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chi Siamo",
};

export default function ChiSiamoPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <h1 className="border-b pb-6 text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
        Chi Siamo
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-7 text-foreground sm:text-base sm:leading-8">
        <p>
          Ricordi Archive nasce da un problema evidente: il sovraccarico di capi generato dal
          fast fashion. Noi rispondiamo con l&apos;opposto.
        </p>
        <p>
          Nel nostro archivio selezioniamo capi e borse di luxury fashion e high-end streetwear
          con un unico criterio: ogni pezzo deve avere qualcosa di irripetibile che lo rende
          speciale. Un dettaglio che si vede, si sente e, una volta indossato, fa davvero la
          differenza.
        </p>
        <p>
          Vogliamo far tornare la moda a parlare, partendo dalle strade. Rendiamo accessibili
          prodotti di lusso a più persone, perché ognuno possa scegliere meno, scegliere meglio e
          diventare parte di una rivoluzione che comincia da sé.
        </p>
      </div>
    </main>
  );
}
