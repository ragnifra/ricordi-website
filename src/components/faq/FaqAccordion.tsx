"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqItem } from "@/lib/i18n/dictionary";

// The questions and answers live in the site dictionary (src/lib/i18n/
// dictionary.ts). Several answers restate the Terms (shipping, withdrawal,
// legal guarantee, authenticity): keep them consistent with
// /termini-e-condizioni when either changes.
export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  return (
    <Accordion>
      {items.map((faq) => (
        <AccordionItem key={faq.id} value={faq.id}>
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
