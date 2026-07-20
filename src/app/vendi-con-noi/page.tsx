import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vendi con noi",
};

const STEPS = [
  {
    number: "1",
    heading: "Inviaci le foto",
    body: "Mostraci il tuo capo, borsa o accessorio con foto chiare di condizioni, etichette ed eventuali prove di autenticità.",
  },
  {
    number: "2",
    heading: "Offerta immediata",
    body: "Il nostro team valuta l'articolo e ti propone un'offerta d'acquisto diretto per il pagamento immediato, basata sulle condizioni e sulla commerciabilità del pezzo.",
  },
  {
    number: "3",
    heading: "Spedizione e pagamento",
    body: "Spedisci il capo al nostro archivio. Una volta ricevuto e verificato fisicamente il pezzo, riceverai il pagamento concordato tramite bonifico entro 24 ore.",
  },
];

export default function VendiConNoiPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="border-b pb-8">
        <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
          Vendi a noi i tuoi articoli
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground sm:text-base sm:leading-8">
          Monetizza istantaneamente il tuo guardaroba luxury senza aspettare i tempi del conto
          vendita. Acquistiamo direttamente i tuoi pezzi.
        </p>
        <a
          href="https://wa.me/393884228100"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 px-8 tracking-[0.15em] uppercase")}
        >
          Inizia ora
        </a>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((step) => (
          <div key={step.number} className="border p-6">
            <span className="font-heading text-3xl text-muted-foreground">{step.number}</span>
            <h3 className="mt-3 text-xs font-medium tracking-[0.15em] text-foreground uppercase">
              {step.heading}
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground">{step.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 space-y-3 border-t pt-8">
        <h2 className="text-lg font-medium tracking-[0.12em] text-foreground uppercase">
          Cosa acquistiamo
        </h2>
        <p className="text-sm leading-7 text-foreground sm:text-base sm:leading-8">
          Se hai nel guardaroba capi, borse o accessori dei brand che contano, noi li compriamo.
          Valutiamo qualsiasi pezzo 100% autentico che lasci il segno: dal lusso classico e
          d&apos;avanguardia di Louis Vuitton, Balenciaga e Vetements, ai capisaldi del capospalla
          e del techwear come Moncler, Stone Island e C.P. Company, fino ai pezzi cult e
          all&apos;hype di Amiri, Rick Owens, Chrome Hearts, Supreme e Palace. Hai un pezzo
          d&apos;archivio iconico (e non solo) o un articolo di un altro brand di livello?
          Proponicelo. Se è originale ed è speciale, lo prendiamo.
        </p>
      </section>
    </main>
  );
}
