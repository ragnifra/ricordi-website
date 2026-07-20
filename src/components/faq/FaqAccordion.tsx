"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    value: "spedizione",
    question: "Quali sono i tempi e i costi di spedizione?",
    answer:
      "Spediamo in tutta Italia e in Europa con corriere tracciato e assicurato. I tempi di consegna sono generalmente di 2-4 giorni lavorativi in Italia. Il costo di spedizione viene calcolato al momento del checkout in base alla destinazione.",
  },
  {
    value: "autenticita",
    question: "Come garantite l'autenticità dei prodotti?",
    answer:
      "Ogni pezzo viene sottoposto a un processo di verifica interno da parte del nostro team, che controlla materiali, hardware, numeri di serie, etichette e documentazione originale prima di essere messo in vendita.",
  },
  {
    value: "resi",
    question: "Qual è la vostra politica di reso?",
    answer:
      "Trattandosi di pezzi unici, disponibili in un solo esemplare, le vendite sono generalmente definitive. Se ricevi un articolo non conforme alla descrizione, contattaci entro 48 ore dalla consegna: valuteremo il reso caso per caso.",
  },
  {
    value: "taglie",
    question: "Come faccio a scegliere la taglia giusta?",
    answer:
      "Ogni scheda prodotto riporta la taglia e le misure effettive del capo. In caso di dubbi su vestibilità o corrispondenza tra taglie di brand diversi, scrivici tramite la pagina Contatti: ti aiutiamo a scegliere la taglia più adatta.",
  },
  {
    value: "pagamenti",
    question: "I pagamenti sono sicuri?",
    answer:
      "Sì. Tutti i pagamenti vengono elaborati tramite Stripe Checkout, che utilizza standard di sicurezza a livello bancario. Non memorizziamo mai i dati della tua carta sui nostri server.",
  },
];

export function FaqAccordion() {
  return (
    <Accordion>
      {FAQS.map((faq) => (
        <AccordionItem key={faq.value} value={faq.value}>
          <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline sm:text-base">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-6 text-muted-foreground sm:text-base">
            <p>{faq.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
