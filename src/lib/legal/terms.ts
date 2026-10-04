// Italian legal text shared by /termini-e-condizioni and the order
// confirmation email (src/lib/email/purchase-confirmation-copy.ts). Every
// string is verbatim from the approved Terms: change wording only on
// instruction, never to tidy it up — and a change here changes BOTH the page
// and the email, which is the point (they must never drift apart). The email's
// English legal text is a separate courtesy translation that must be updated
// by hand whenever 7.4, 7.6 or section 8 change.

export type ClauseSection = {
  id: string;
  heading: string;
  clauses: string[];
};

export const SELLER = {
  name: "RICORDI ARCHIVE DI BARUFFI EDOARDO",
  registeredOffice: "Via Corelli 36, 61122 Pesaro (PU)",
  vatNumber: "02862300411",
  taxCode: "BRFDRD01P17G479G",
  rea: "PS - 310441, CCIAA delle Marche",
  pec: "ricordiarchive@pec.it",
  supportEmail: "ricordiarchive@hotmail.com",
  phone: "+39 388 4228100",
} as const;

export const SELLER_DETAILS = [
  { label: "Denominazione:", value: SELLER.name },
  { label: "Sede legale:", value: SELLER.registeredOffice },
  { label: "Partita IVA:", value: SELLER.vatNumber },
  { label: "Codice Fiscale:", value: SELLER.taxCode },
  { label: "Iscrizione REA:", value: SELLER.rea },
  { label: "PEC:", value: SELLER.pec },
  { label: "Email assistenza clienti:", value: SELLER.supportEmail },
  { label: "Telefono / WhatsApp:", value: SELLER.phone },
];

// Clause bodies without their number, for the email's delivery and customs
// rows — the section below prefixes the number back, so the page renders
// exactly "7.4 I tempi…" as before.
export const TERMS_7_4_DELIVERY =
  "I tempi di consegna indicati sono stimati e decorrono dalla presa in carico del collo da parte del corriere. La consegna avviene comunque entro 30 giorni dalla conclusione del contratto, salvo diverso accordo tra le parti.";

export const TERMS_7_6_CUSTOMS =
  "Spedizioni fuori dall'Unione Europea. Per le destinazioni extra-UE (inclusi gli Stati Uniti) possono applicarsi dazi doganali, imposte e oneri di sdoganamento, determinati dalle autorità del paese di destinazione. Tali oneri sono a carico esclusivo del cliente e non sono inclusi nel prezzo esposto né nelle spese di spedizione. Il rifiuto del collo per mancato pagamento di tali oneri non dà diritto al rimborso delle spese di spedizione sostenute.";

export const TERMS_SECTION_7: ClauseSection = {
  id: "spedizione",
  heading: "7. Spedizione e consegna",
  clauses: [
    "7.1 Il Venditore spedisce in Italia, nei Paesi dell'Unione Europea e negli Stati Uniti d'America. L'elenco aggiornato dei paesi serviti è quello selezionabile in fase di pagamento.",
    "7.2 Le spese di spedizione sono calcolate in tempo reale sulla base del paese di destinazione e delle caratteristiche del collo, e sono visualizzate prima della conferma dell'ordine.",
    "7.3 Spedizione gratuita in Italia per ordini di importo pari o superiore a 150 euro. Per le destinazioni estere le spese di spedizione sono sempre a carico del cliente.",
    `7.4 ${TERMS_7_4_DELIVERY}`,
    "7.5 Il cliente è tenuto a verificare l'integrità del collo al momento della consegna e a segnalare tempestivamente eventuali anomalie al corriere e al Venditore.",
    `7.6 ${TERMS_7_6_CUSTOMS}`,
  ],
};

export const TERMS_SECTION_8: ClauseSection = {
  id: "recesso",
  heading: "8. Diritto di recesso",
  clauses: [
    "8.1 Il cliente che agisce in qualità di consumatore ha diritto di recedere dal contratto, senza dover fornire motivazione, entro 14 giorni dal giorno in cui egli o un terzo da lui designato acquisisce il possesso fisico del bene.",
    "8.2 Per esercitare il recesso il cliente deve comunicarlo con dichiarazione esplicita inviata a ricordiarchive@hotmail.com prima della scadenza del termine, utilizzando se lo desidera il modulo tipo allegato alle presenti Condizioni.",
    "8.3 Il bene deve essere restituito entro 14 giorni dalla comunicazione del recesso, integro, non utilizzato, non lavato o alterato, completo di eventuali cartellini, etichette, accessori e confezione originale. Il cliente è responsabile della diminuzione di valore del bene risultante da una manipolazione diversa da quella necessaria per stabilirne natura, caratteristiche e funzionamento.",
    "8.4 I costi diretti della restituzione sono a carico del cliente.",
    "8.5 Il Venditore rimborsa tutti i pagamenti ricevuti, comprese le spese di consegna standard sostenute dal cliente, entro 14 giorni dal momento in cui è venuto a conoscenza del recesso. Il rimborso può essere sospeso fino al ricevimento del bene o fino a quando il cliente non dimostri di averlo rispedito. Qualora il cliente abbia scelto un tipo di consegna più oneroso di quello standard offerto, il Venditore non è tenuto a rimborsare la differenza.",
    "8.6 Il rimborso avviene con lo stesso mezzo di pagamento utilizzato per l'acquisto, salvo diverso accordo e comunque senza costi per il cliente.",
    "8.7 Trattandosi di pezzi unici, in caso di recesso il Venditore non è tenuto a proporre la sostituzione con un articolo equivalente.",
    "8.8 Esclusioni per motivi igienici. Ai sensi dell'art. 59 del Codice del Consumo, il diritto di recesso non si applica alla fornitura di beni sigillati che non si prestano a essere restituiti per motivi igienici o connessi alla protezione della salute, qualora siano stati aperti dopo la consegna. Rientrano in tale categoria, tra gli altri, intimo, calze, costumi da bagno, lingerie e orecchini, che vengono spediti in confezione sigillata. Il recesso resta pienamente esercitabile qualora la confezione sigillata non sia stata aperta.",
  ],
};

// "Allegato — Modulo tipo di recesso". Field lines keep their double spaces
// ("Ordinato il: …  Ricevuto il: …"), so render them with pre-wrap.
export const WITHDRAWAL_FORM = {
  id: "modulo-recesso",
  heading: "Allegato — Modulo tipo di recesso",
  instructions:
    "(Compilare e restituire il presente modulo solo se si desidera recedere dal contratto.)",
  recipient:
    "Destinatario: RICORDI ARCHIVE DI BARUFFI EDOARDO — Via Corelli 36, 61122 Pesaro (PU) — ricordiarchive@hotmail.com",
  declaration:
    "Con la presente io/noi notifico/notifichiamo il recesso dal mio/nostro contratto di vendita dei seguenti beni:",
  fields: [
    "Descrizione del bene: ______________________________",
    "Ordine n.: ______________________________",
    "Ordinato il: ______________  Ricevuto il: ______________",
    "Nome del consumatore: ______________________________",
    "Indirizzo del consumatore: ______________________________",
    "Data: ______________",
  ],
} as const;
