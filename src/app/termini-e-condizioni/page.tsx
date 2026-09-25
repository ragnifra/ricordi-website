import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini e Condizioni",
};

// Legal text: every string below is verbatim from the approved Terms. Change
// wording only on instruction, never to tidy it up.

type ClauseSection = {
  id: string;
  heading: string;
  clauses: string[];
};

const SELLER_DETAILS = [
  { label: "Denominazione:", value: "RICORDI ARCHIVE DI BARUFFI EDOARDO" },
  { label: "Sede legale:", value: "Via Corelli 36, 61122 Pesaro (PU)" },
  { label: "Partita IVA:", value: "02862300411" },
  { label: "Codice Fiscale:", value: "BRFDRD01P17G479G" },
  { label: "Iscrizione REA:", value: "PS - 310441, CCIAA delle Marche" },
  { label: "PEC:", value: "ricordiarchive@pec.it" },
  { label: "Email assistenza clienti:", value: "ricordiarchive@hotmail.com" },
  { label: "Telefono / WhatsApp:", value: "+39 388 4228100" },
];

const SECTIONS_2_TO_11: ClauseSection[] = [
  {
    id: "oggetto",
    heading: "2. Oggetto e ambito di applicazione",
    clauses: [
      "2.1 Le presenti Condizioni Generali di Vendita disciplinano l'acquisto di prodotti effettuato a distanza tramite il sito www.ricordiarchive.com.",
      "2.2 Il sito è rivolto esclusivamente a consumatori maggiorenni, intesi come persone fisiche che agiscono per scopi estranei alla propria attività imprenditoriale, commerciale, artigianale o professionale. Effettuando un ordine, l'utente dichiara di avere compiuto 18 anni e di avere la capacità di agire.",
      "2.3 L'invio di un ordine comporta la presa visione e l'accettazione integrale delle presenti Condizioni, che il cliente è invitato a leggere e a conservare prima di procedere al pagamento.",
      "2.4 Il Venditore si riserva la facoltà di modificare le presenti Condizioni. Alle vendite già concluse si applicano le Condizioni in vigore al momento dell'invio dell'ordine.",
      "2.5 Lingua del contratto. Il contratto si conclude in lingua italiana. Eventuali traduzioni delle presenti Condizioni o delle schede prodotto sono fornite a fini esclusivamente informativi; in caso di divergenza prevale la versione italiana.",
    ],
  },
  {
    id: "prodotti",
    heading: "3. Natura dei prodotti",
    clauses: [
      "3.1 Ricordi Archive è un archivio di capi e accessori di seconda mano, selezionati nell'ambito del lusso e dello streetwear di fascia alta. Salvo diversa indicazione nella scheda prodotto, gli articoli non sono nuovi.",
      "3.2 Ogni articolo è, di norma, un pezzo unico: la disponibilità è limitata all'esemplare fotografato e descritto nella relativa scheda. Quando lo stesso modello è disponibile in più taglie, ciascuna taglia costituisce un esemplare distinto, con proprie condizioni, misure e, se del caso, proprie fotografie.",
      "3.3 Ogni scheda prodotto riporta: le condizioni dell'esemplare, le misure rilevate in centimetri, la composizione (ove disponibile) ed eventuali note di autenticità. Le fotografie rappresentano l'esemplare effettivamente in vendita.",
      "3.4 Trattandosi di capi usati, sono da considerarsi normali e non costituiscono difetto i segni d'uso, le lievi variazioni cromatiche, le patine e le caratteristiche descritte nella scheda prodotto. Eventuali imperfezioni rilevanti sono segnalate nella descrizione e, ove possibile, documentate fotograficamente.",
      "3.5 Le immagini possono presentare lievi differenze di resa cromatica rispetto all'originale, dovute alle impostazioni del dispositivo di visualizzazione.",
    ],
  },
  {
    id: "conclusione-contratto",
    heading: "4. Conclusione del contratto",
    clauses: [
      "4.1 La presentazione dei prodotti sul sito costituisce invito a formulare una proposta d'acquisto e non offerta al pubblico.",
      "4.2 Il cliente seleziona l'articolo, procede al pagamento e, in tale fase, inserisce i dati necessari alla spedizione. Prima della conferma il cliente visualizza il riepilogo con prezzo, spese di spedizione e importo totale.",
      "4.3 Al momento dell'avvio della procedura di pagamento, l'articolo viene riservato per un tempo limitato. Se il pagamento non viene completato entro tale termine, l'articolo torna disponibile per gli altri utenti.",
      "4.4 Il contratto si intende concluso al buon fine del pagamento. Il Venditore invia al cliente una conferma d'ordine all'indirizzo email indicato, contenente il riepilogo dell'acquisto.",
      "4.5 Il Venditore si riserva di non dare corso a ordini che risultino incompleti, non conformi alle presenti Condizioni, o che provengano da soggetti con i quali sussistano contenziosi o precedenti inadempimenti. In tal caso il cliente viene informato e integralmente rimborsato.",
    ],
  },
  {
    id: "prezzi",
    heading: "5. Prezzi",
    clauses: [
      "5.1 Tutti i prezzi sono espressi in Euro (EUR) e si intendono comprensivi di IVA, ove applicabile ai sensi del regime fiscale del Venditore.",
      "5.2 Le spese di spedizione sono indicate separatamente e vengono calcolate in funzione del paese di destinazione prima della conferma dell'ordine.",
      "5.3 Il prezzo applicabile è quello esposto al momento dell'invio dell'ordine. Il Venditore si riserva di modificare i prezzi in qualsiasi momento, senza che ciò incida sugli ordini già confermati.",
      "5.4 Errori manifesti di prezzo. Qualora, per un errore materiale di inserimento o per un malfunzionamento tecnico, un articolo risulti esposto a un prezzo palesemente errato e sproporzionato rispetto al suo valore di mercato, il Venditore ne dà tempestiva comunicazione al cliente e può annullare l'ordine, procedendo al rimborso integrale di quanto eventualmente già corrisposto. Il cliente può, in alternativa, confermare l'acquisto al prezzo corretto.",
    ],
  },
  {
    id: "pagamenti",
    heading: "6. Pagamenti e documento fiscale",
    clauses: [
      "6.1 I pagamenti sono gestiti tramite Stripe, fornitore di servizi di pagamento che opera in conformità agli standard di sicurezza del settore. I dati della carta sono trattati direttamente da Stripe: il Venditore non vi ha accesso e non li conserva.",
      "6.2 I metodi di pagamento accettati sono quelli esposti nella pagina di pagamento al momento dell'acquisto.",
      "6.3 L'ordine viene evaso solo dopo la conferma dell'avvenuto pagamento.",
      "6.4 Documento fiscale. Per ogni acquisto il Venditore emette fattura elettronica, che sostituisce a ogni effetto lo scontrino/corrispettivo, entro 24 ore dalla conclusione dell'ordine. La fattura viene inviata all'indirizzo email indicato dal cliente in fase di acquisto, sulla base dei dati di fatturazione forniti al momento dell'ordine.",
    ],
  },
  {
    id: "spedizione",
    heading: "7. Spedizione e consegna",
    clauses: [
      "7.1 Il Venditore spedisce in Italia, nei Paesi dell'Unione Europea e negli Stati Uniti d'America. L'elenco aggiornato dei paesi serviti è quello selezionabile in fase di pagamento.",
      "7.2 Le spese di spedizione sono calcolate in tempo reale sulla base del paese di destinazione e delle caratteristiche del collo, e sono visualizzate prima della conferma dell'ordine.",
      "7.3 Spedizione gratuita in Italia per ordini di importo pari o superiore a 150 euro. Per le destinazioni estere le spese di spedizione sono sempre a carico del cliente.",
      "7.4 I tempi di consegna indicati sono stimati e decorrono dalla presa in carico del collo da parte del corriere. La consegna avviene comunque entro 30 giorni dalla conclusione del contratto, salvo diverso accordo tra le parti.",
      "7.5 Il cliente è tenuto a verificare l'integrità del collo al momento della consegna e a segnalare tempestivamente eventuali anomalie al corriere e al Venditore.",
      "7.6 Spedizioni fuori dall'Unione Europea. Per le destinazioni extra-UE (inclusi gli Stati Uniti) possono applicarsi dazi doganali, imposte e oneri di sdoganamento, determinati dalle autorità del paese di destinazione. Tali oneri sono a carico esclusivo del cliente e non sono inclusi nel prezzo esposto né nelle spese di spedizione. Il rifiuto del collo per mancato pagamento di tali oneri non dà diritto al rimborso delle spese di spedizione sostenute.",
    ],
  },
  {
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
  },
  {
    id: "garanzia",
    heading: "9. Garanzia legale di conformità",
    clauses: [
      "9.1 Ai prodotti si applica la garanzia legale di conformità prevista dagli articoli 128 e seguenti del Codice del Consumo, a tutela del consumatore contro i difetti di conformità esistenti al momento della consegna.",
      "9.2 Beni usati — durata ridotta. Tutti i prodotti venduti da Ricordi Archive sono beni usati. Ai sensi dell'art. 133 del Codice del Consumo, le parti convengono espressamente che, per tali beni, la durata della responsabilità del Venditore è ridotta a 1 (uno) anno dalla consegna, in luogo dei due anni ordinariamente previsti. Il cliente prende atto e accetta espressamente tale riduzione con l'invio dell'ordine.",
      "9.3 La garanzia non copre: i difetti derivanti dal normale uso pregresso del bene; le caratteristiche e imperfezioni espressamente indicate nella scheda prodotto e portate a conoscenza del cliente prima dell'acquisto; i danni derivanti da uso improprio, negligenza, lavaggi o interventi di riparazione non autorizzati successivi alla consegna.",
      "9.4 Per far valere la garanzia il cliente deve contattare ricordiarchive@hotmail.com descrivendo il difetto e allegando documentazione fotografica.",
    ],
  },
  {
    id: "autenticita",
    heading: "10. Autenticità",
    clauses: [
      "10.1 Il Venditore seleziona e verifica ogni articolo prima della messa in vendita. Le eventuali informazioni disponibili sulla provenienza e sull'autenticazione sono riportate nella scheda prodotto.",
      "10.2 Qualora, successivamente all'acquisto, emergessero elementi tali da mettere in dubbio l'autenticità di un articolo, il cliente è invitato a contattare tempestivamente il Venditore, allegando la documentazione a supporto. Verificata la fondatezza della contestazione, il Venditore provvederà al rimborso integrale del prezzo e delle spese di spedizione, previa restituzione dell'articolo.",
      "10.3 Ricordi Archive non è affiliata né autorizzata dai marchi i cui prodotti sono offerti in vendita. I marchi e i segni distintivi citati appartengono ai rispettivi titolari e sono utilizzati al solo fine di identificare e descrivere gli articoli in vendita.",
    ],
  },
  {
    id: "responsabilita",
    heading: "11. Limitazioni di responsabilità",
    clauses: [
      "11.1 Il Venditore non risponde di disservizi imputabili a caso fortuito o forza maggiore, né di ritardi di consegna imputabili al corriere o alle autorità doganali.",
      "11.2 Nulla nelle presenti Condizioni limita o esclude i diritti inderogabili riconosciuti al consumatore dalla legge.",
    ],
  },
];

const SECTION_14: ClauseSection = {
  id: "legge-applicabile",
  heading: "14. Legge applicabile e foro competente",
  clauses: [
    "14.1 Le presenti Condizioni sono regolate dalla legge italiana.",
    "14.2 Per le controversie con consumatori residenti in Italia è competente in via esclusiva il foro del luogo di residenza o domicilio elettivo del consumatore, se ubicato nel territorio dello Stato.",
    "14.3 Per i consumatori residenti in altri Stati dell'Unione Europea restano ferme le disposizioni inderogabili di tutela previste dall'ordinamento del paese di residenza.",
    "14.4 Clienti residenti fuori dall'Unione Europea. Per gli acquisti effettuati da consumatori residenti al di fuori dell'Unione Europea, inclusi gli Stati Uniti d'America, si applicano le presenti Condizioni e la legge italiana, fatte salve le norme inderogabili eventualmente previste dall'ordinamento del paese di residenza del consumatore. Restano a carico del cliente gli oneri doganali e fiscali di cui al punto 7.6.",
    '14.5 Vendite verso gli Stati Uniti — sales tax. Il Venditore monitora il volume delle vendite verso ciascuno Stato degli Stati Uniti d\'America. Non disponendo di una presenza fisica sul territorio statunitense, il Venditore non applica la sales tax locale fintanto che il fatturato verso un singolo Stato resta al di sotto della soglia di "economic nexus" prevista da quello Stato (di norma 100.000 USD di fatturato annuo, con soglie superiori in alcuni Stati). Qualora tale soglia venga superata in uno o più Stati, il Venditore si impegna a registrarsi presso l\'autorità fiscale competente e ad applicare, riscuotere e versare la sales tax dovuta, avvalendosi eventualmente di un servizio di calcolo automatico integrato con il proprio processore di pagamento.',
  ],
};

const WITHDRAWAL_FORM_FIELDS = [
  "Descrizione del bene: ______________________________",
  "Ordine n.: ______________________________",
  "Ordinato il: ______________  Ricevuto il: ______________",
  "Nome del consumatore: ______________________________",
  "Indirizzo del consumatore: ______________________________",
  "Data: ______________",
];

const EXTERNAL_LINK_CLASS =
  "text-foreground underline underline-offset-4 hover:text-muted-foreground";

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 border-t pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-base font-medium tracking-[0.12em] text-foreground uppercase sm:text-lg">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Clauses({ clauses }: { clauses: string[] }) {
  return (
    <>
      {clauses.map((clause) => (
        <p key={clause.slice(0, 5)}>{clause}</p>
      ))}
    </>
  );
}

export default function TerminiECondizioniPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="space-y-2 border-b pb-6">
        <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase sm:text-3xl">
          Termini e Condizioni di Vendita
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          <strong className="font-medium text-foreground">Ricordi Archive</strong> —
          www.ricordiarchive.com
        </p>
        <p className="text-xs tracking-wider text-muted-foreground">
          Ultimo aggiornamento: 14 settembre 2026
        </p>
      </div>

      <div className="mt-8 space-y-8 text-sm leading-7 break-words text-foreground sm:text-base sm:leading-8">
        <Section id="venditore" heading="1. Informazioni sul venditore">
          <p>I prodotti presenti su www.ricordiarchive.com sono venduti da:</p>
          <ul className="space-y-1 border-l pl-4">
            {SELLER_DETAILS.map((detail) => (
              <li key={detail.label}>
                <strong className="font-medium">{detail.label}</strong> {detail.value}
              </li>
            ))}
          </ul>
          <p>Di seguito, &quot;Venditore&quot; o &quot;Ricordi Archive&quot;.</p>
        </Section>

        {SECTIONS_2_TO_11.map((section) => (
          <Section key={section.id} id={section.id} heading={section.heading}>
            <Clauses clauses={section.clauses} />
          </Section>
        ))}

        <Section id="reclami" heading="12. Reclami e risoluzione delle controversie">
          <p>
            12.1 I reclami vanno indirizzati a ricordiarchive@hotmail.com. Il Venditore si impegna
            a rispondere entro 48-72 ore lavorative dal ricevimento del reclamo.
          </p>
          <p>
            12.2 Le parti si impegnano a ricercare in buona fede una soluzione amichevole prima di
            adire l&apos;autorità giudiziaria. Resta impregiudicata la facoltà del consumatore di
            rivolgersi agli organismi di risoluzione alternativa delle controversie (ADR)
            competenti, anche tramite la piattaforma europea di risoluzione delle controversie
            online (ODR), disponibile all&apos;indirizzo{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className={EXTERNAL_LINK_CLASS}
            >
              https://ec.europa.eu/consumers/odr
            </a>
            .
          </p>
        </Section>

        <Section id="dati-personali" heading="13. Protezione dei dati personali">
          <p>
            13.1 Il trattamento dei dati personali è disciplinato dalla{" "}
            <a
              href="https://www.iubenda.com/privacy-policy/52999084"
              target="_blank"
              rel="noopener noreferrer"
              className={EXTERNAL_LINK_CLASS}
            >
              Privacy Policy
            </a>{" "}
            e dalla{" "}
            <a
              href="https://www.iubenda.com/privacy-policy/52999084/cookie-policy"
              target="_blank"
              rel="noopener noreferrer"
              className={EXTERNAL_LINK_CLASS}
            >
              Cookie Policy
            </a>
            , che costituiscono parte integrante delle presenti Condizioni.
          </p>
        </Section>

        <Section id={SECTION_14.id} heading={SECTION_14.heading}>
          <Clauses clauses={SECTION_14.clauses} />
        </Section>

        <Section id="modulo-recesso" heading="Allegato — Modulo tipo di recesso">
          <div className="space-y-4 border p-4 sm:p-6">
            <p className="text-muted-foreground italic">
              (Compilare e restituire il presente modulo solo se si desidera recedere dal
              contratto.)
            </p>
            <p>
              Destinatario: RICORDI ARCHIVE DI BARUFFI EDOARDO — Via Corelli 36, 61122 Pesaro (PU)
              — ricordiarchive@hotmail.com
            </p>
            <p>
              Con la presente io/noi notifico/notifichiamo il recesso dal mio/nostro contratto di
              vendita dei seguenti beni:
            </p>
            <ul className="space-y-3">
              {WITHDRAWAL_FORM_FIELDS.map((field) => (
                <li key={field} className="whitespace-pre-wrap">
                  {field}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </div>
    </main>
  );
}
