import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, User, Package, CreditCard, Truck, Clock, MapPin } from "lucide-react";

const FAQ = () => {
  const faqCategories = [
    {
      icon: User,
      title: "Account e Registrazione",
      questions: [
        {
          q: "Come posso registrarmi su ALFREDO?",
          a: "Clicca su 'Accedi/Registrati' in alto a destra, inserisci la tua email e crea una password. Dopo la registrazione, completa il tuo profilo con i dati di consegna."
        },
        {
          q: "Posso modificare i miei dati personali?",
          a: "Sì, accedi alla sezione 'Profilo' dal menu utente e potrai modificare tutti i tuoi dati personali, indirizzo di consegna, allergie e preferenze alimentari."
        },
        {
          q: "Ho dimenticato la password, come posso recuperarla?",
          a: "Nella pagina di login, clicca su 'Password dimenticata?' e segui le istruzioni per ricevere un link di reset via email."
        }
      ]
    },
    {
      icon: Package,
      title: "Ordini e Spesa",
      questions: [
        {
          q: "Come funziona il servizio di spesa?",
          a: "Crei una lista della spesa scrivendo i prodotti che desideri, scegli il supermercato, la data e la fascia oraria di consegna. Un nostro Alfredo farà la spesa per te e te la consegnerà a casa."
        },
        {
          q: "Posso comunicare con l'Alfredo durante la spesa?",
          a: "Sì! Una volta che l'Alfredo accetta l'ordine, puoi chattare direttamente con lui per richieste speciali, sostituzioni o domande sui prodotti."
        },
        {
          q: "Cosa succede se un prodotto non è disponibile?",
          a: "L'Alfredo ti contatterà via chat per proporti un'alternativa o rimuovere il prodotto. Pagherai solo per i prodotti effettivamente acquistati."
        },
        {
          q: "Qual è il limite minimo per un ordine?",
          a: "Non c'è un ordine minimo, ma per ordini piccoli le spese di consegna potrebbero incidere percentualmente di più sul totale."
        },
        {
          q: "Posso annullare o modificare un ordine?",
          a: "Puoi modificare o annullare gratuitamente fino a quando l'Alfredo non ha iniziato la spesa. Dopo, contatta il servizio clienti per verificare le possibilità."
        }
      ]
    },
    {
      icon: CreditCard,
      title: "Pagamenti e Prezzi",
      questions: [
        {
          q: "Quali metodi di pagamento accettate?",
          a: "Accettiamo carte di credito/debito (Visa, Mastercard, American Express) e PayPal. I pagamenti sono sicuri e criptati."
        },
        {
          q: "Quando viene addebitato il pagamento?",
          a: "Il pagamento viene addebitato solo dopo che l'Alfredo ha completato la spesa e confermato l'importo finale, che potrebbe variare leggermente dalla stima iniziale."
        },
        {
          q: "Quanto costa il servizio?",
          a: "La tariffa di consegna parte da €3.99 e può variare in base alla distanza e alla fascia oraria. Visualizzerai il costo esatto prima di confermare l'ordine."
        },
        {
          q: "I prezzi dei prodotti sono gli stessi del supermercato?",
          a: "Sì, i prodotti hanno gli stessi prezzi che troveresti in negozio. Visualizzeremo una stima basata sui prezzi di mercato e aggiorneremo con il totale esatto dopo la spesa."
        },
        {
          q: "Posso usare i buoni pasto?",
          a: "Sì! Alcuni supermercati partner accettano buoni pasto elettronici. Contattaci per maggiori informazioni sui negozi e le modalità."
        }
      ]
    },
    {
      icon: Truck,
      title: "Consegna",
      questions: [
        {
          q: "In quali zone consegnate?",
          a: "Attualmente operiamo principalmente nella zona di Anzio e dintorni. Inserisci il tuo indirizzo per verificare la copertura nella tua area."
        },
        {
          q: "Quali sono gli orari di consegna?",
          a: "Puoi scegliere tra diverse fasce orarie: mattina (9:00-11:00), pranzo (12:00-14:00), pomeriggio (15:00-17:00) e sera (18:00-20:00). Disponibilità variabile per zona."
        },
        {
          q: "Posso tracciare la mia consegna?",
          a: "Sì! Una volta che l'Alfredo inizia la spesa, puoi seguire lo stato dell'ordine in tempo reale dalla sezione 'I miei ordini'. Riceverai anche notifiche via chat."
        },
        {
          q: "Devo essere presente alla consegna?",
          a: "Sì, è necessario che qualcuno sia presente per ricevere la spesa e verificare i prodotti. L'Alfredo ti mostrerà lo scontrino originale."
        },
        {
          q: "Posso richiedere la consegna contactless?",
          a: "Sì, puoi indicare nelle note di consegna se preferisci che l'Alfredo lasci la spesa alla porta, mantenendo la distanza di sicurezza."
        }
      ]
    },
    {
      icon: HelpCircle,
      title: "Per Alfredi (Fattorini)",
      questions: [
        {
          q: "Come posso diventare un Alfredo?",
          a: "Visita la sezione 'Diventa Alfredo' e compila la richiesta. Valuteremo la tua candidatura e ti contatteremo per i prossimi passi."
        },
        {
          q: "Quali sono i requisiti per diventare Alfredo?",
          a: "Devi avere almeno 18 anni, un mezzo di trasporto affidabile, uno smartphone e disponibilità flessibile. È richiesta anche affidabilità e cortesia."
        },
        {
          q: "Quanto guadagna un Alfredo?",
          a: "Il guadagno varia in base al numero di consegne e alle fasce orarie. Ogni Alfredo gestisce i propri orari e può accettare gli ordini che preferisce."
        },
        {
          q: "Come funziona il sistema di notifiche per gli Alfredi?",
          a: "Riceverai notifiche su Telegram per le nuove consegne nella tua zona. Puoi accettare o rifiutare in base alla tua disponibilità."
        },
        {
          q: "Cosa devo fare se un prodotto non è disponibile?",
          a: "Contatta il cliente tramite la chat integrata e proponi un'alternativa simile. Il cliente può approvare la sostituzione o rimuovere l'articolo."
        }
      ]
    },
    {
      icon: Clock,
      title: "Assistenza",
      questions: [
        {
          q: "Come posso contattare l'assistenza clienti?",
          a: "Puoi contattarci via email a info@alfredo.it o telefonicamente al +39 123 456 7890 durante gli orari di ufficio (9:00-19:00, lun-sab)."
        },
        {
          q: "Cosa faccio in caso di problemi con la consegna?",
          a: "Se riscontri problemi con l'ordine o la consegna, contattaci immediatamente. Valuteremo la situazione e troveremo una soluzione, che può includere rimborsi o crediti."
        },
        {
          q: "Come posso segnalare un problema con un prodotto?",
          a: "Se ricevi un prodotto danneggiato o non conforme, segnalacelo entro 24 ore dalla consegna con foto. Provvederemo al rimborso o alla sostituzione."
        },
        {
          q: "Posso richiedere una fattura?",
          a: "Sì, puoi richiedere una fattura indicandolo nelle note dell'ordine e fornendo i dati di fatturazione nel tuo profilo."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <HelpCircle className="h-16 w-16 mx-auto mb-6 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Domande Frequenti (FAQ)
              </h1>
              <p className="text-lg text-muted-foreground">
                Trova rapidamente le risposte alle tue domande su ALFREDO
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="space-y-12">
              {faqCategories.map((category, idx) => {
                const Icon = category.icon;
                return (
                  <Card key={idx} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
                      <CardTitle className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        {category.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Accordion type="single" collapsible className="w-full">
                        {category.questions.map((faq, qIdx) => (
                          <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                            <AccordionTrigger className="text-left">
                              {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Contact CTA */}
            <Card className="mt-12 bg-gradient-to-br from-primary/10 to-secondary/10 border-none">
              <CardContent className="pt-6 text-center">
                <h3 className="text-2xl font-bold mb-4">
                  Non hai trovato la risposta che cercavi?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Il nostro team di supporto è sempre pronto ad aiutarti
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="mailto:info@alfredo.it"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Invia un'email
                  </a>
                  <a 
                    href="tel:+39123456789"
                    className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                  >
                    Chiamaci
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
