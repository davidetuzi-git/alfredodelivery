import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle, 
  User, 
  Wallet,
  Shield,
  Star,
  TrendingUp,
  Users,
  Package,
  FileText,
  AlertCircle
} from "lucide-react";

const HowItWorksPage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Search,
      title: "1. Prepara la lista e controlla i prezzi",
      description: "Crea la tua lista della spesa e confronta i prezzi tra i supermercati disponibili nella tua zona. Il nostro sistema ti aiuta a trovare le migliori offerte.",
      color: "text-blue-600"
    },
    {
      icon: MapPin,
      title: "2. Scegli il supermercato",
      description: "Seleziona il supermercato più conveniente o quello che preferisci. Puoi vedere tutti i negozi disponibili nel raggio di 7km dal tuo indirizzo.",
      color: "text-green-600"
    },
    {
      icon: Clock,
      title: "3. Seleziona data e orario",
      description: "Scegli quando vuoi ricevere la tua spesa. Offriamo diverse fasce orarie per adattarci alle tue esigenze.",
      color: "text-purple-600"
    },
    {
      icon: User,
      title: "4. Un Alfredo fa la spesa per te",
      description: "Un nostro Alfredo si occuperà di fare la spesa al supermercato che hai scelto, selezionando con cura i prodotti della tua lista.",
      color: "text-orange-600"
    },
    {
      icon: Package,
      title: "5. Ricevi tutto a casa",
      description: "La tua spesa viene consegnata direttamente a casa tua nella fascia oraria scelta. Riceverai un codice di ritiro che potrai condividere con chiunque per delegare il ritiro.",
      color: "text-red-600"
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Risparmia tempo",
      description: "Non dovrai più passare ore al supermercato. Pensa a tutto il tempo che recupererai per te e la tua famiglia."
    },
    {
      icon: TrendingUp,
      title: "Risparmia denaro",
      description: "Confronta i prezzi tra diversi supermercati e scegli sempre le offerte migliori. I nostri clienti risparmiano in media €856 all'anno."
    },
    {
      icon: Shield,
      title: "Sicurezza garantita",
      description: "Tutti gli Alfedi sono verificati e assicurati. La tua spesa è in mani sicure."
    },
    {
      icon: Star,
      title: "Qualità controllata",
      description: "I nostri Alfedi selezionano i prodotti con cura, controllando sempre la freschezza e la qualità."
    }
  ];

  const alfredoSteps = [
    {
      icon: Users,
      title: "Unisciti alla community",
      description: "Diventa parte della famiglia ALFREDO e inizia a guadagnare aiutando gli altri con la spesa."
    },
    {
      icon: Wallet,
      title: "Guadagna in modo flessibile",
      description: "Scegli quando lavorare e quanto guadagnare. Gestisci i tuoi orari in totale autonomia."
    },
    {
      icon: CheckCircle,
      title: "Formazione inclusa",
      description: "Ti formiamo su come selezionare i prodotti e garantire la migliore esperienza ai clienti."
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Come funziona
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            La tua spesa in{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              5 semplici passi
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ALFREDO rende la spesa facile, veloce e conveniente. Scopri come funziona il nostro servizio.
          </p>
        </div>
      </div>

      {/* Steps Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className={`${step.color} bg-primary/5 p-4 rounded-2xl flex-shrink-0`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button 
            size="lg" 
            className="text-lg px-8"
            onClick={() => navigate("/ordina")}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Inizia a ordinare
          </Button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-secondary/5 to-background py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perché scegliere ALFREDO?
            </h2>
            <p className="text-xl text-muted-foreground">
              Migliaia di clienti hanno già scoperto i vantaggi
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 p-3 rounded-xl flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Become Alfredo Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Diventa un Alfredo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Vuoi diventare un Alfredo?
            </h2>
            <p className="text-xl text-muted-foreground">
              Unisciti alla nostra community e inizia a guadagnare
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {alfredoSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="bg-background p-4 rounded-2xl inline-flex mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              <Users className="mr-2 h-5 w-5" />
              Scopri di più
            </Button>
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge className="mb-4">
            <FileText className="h-3 w-3 mr-1" />
            Regole del Servizio
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Regole per equità, qualità e sostenibilità
          </h2>
          <p className="text-xl text-muted-foreground">
            Per assicurare un servizio affidabile, ALFREDO definisce regole precise per tutti i soggetti coinvolti
          </p>
        </div>

        {/* Rules for Shoppers */}
        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Per gli Shopper (Alfredi)</h3>
              </div>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Formazione obbligatoria e certificazione prima dell&apos;attivazione</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Rispetto rigoroso dei tempi, con comunicazione tempestiva di eventuali ritardi o problemi</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Gestione professionale degli ordini: attenzione a qualità, sostituzioni e comunicazioni precise</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Comportamento corretto, cortese e trasparente: feedback negativi continuativi portano a sospensioni o esclusioni</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Rispettare limiti di volume, sovrattasse e regole su prodotti soggetti a restrizioni (es. farmaci)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Rules for Users */}
        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-secondary/10 p-3 rounded-xl">
                <User className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Per gli Utenti</h3>
              </div>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>Inserimento ordini attenti e completi: specifiche chiare su quantità, marche, preferenze o allergie</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>Osservanza dei limiti di ordine e spesa minima</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>Comunicazione rapida e puntuale in caso di variazioni o reclami</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>Feedback costruttivi e onesti per migliorare il servizio</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Rules for Platform */}
        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Per la Piattaforma e il Team ALFREDO</h3>
              </div>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Monitoraggio continuo di KPI e qualità del servizio</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Customer care reattivo e pronto a risolvere i problemi</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Aggiornamento regolare delle regole e policy in base a dati, feedback e normative</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Rigida compliance GDPR e tutela dei dati</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Limits Table */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Tabella Riepilogativa Limiti e Supplementi</h3>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary/5 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Limite / Prodotto</th>
                      <th className="px-4 py-3 text-left font-semibold">Quantità Consentita</th>
                      <th className="px-4 py-3 text-left font-semibold">Supplemento Applicato</th>
                      <th className="px-4 py-3 text-left font-semibold">Motivazione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">Buste standard</td>
                      <td className="px-4 py-3 text-muted-foreground">Max 3 buste (20-25 litri totali)</td>
                      <td className="px-4 py-3 text-muted-foreground">3 € per ogni busta aggiuntiva</td>
                      <td className="px-4 py-3 text-muted-foreground">Incremento costi logistici e trasporto</td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">Volume acqua</td>
                      <td className="px-4 py-3 text-muted-foreground">Incluso nel volume buste</td>
                      <td className="px-4 py-3 text-muted-foreground">0,50 € ogni 3 litri eccedenti</td>
                      <td className="px-4 py-3 text-muted-foreground">Elevato peso e volume dell&apos;acqua</td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">Ordine solo acqua</td>
                      <td className="px-4 py-3 text-muted-foreground">Max 12 litri</td>
                      <td className="px-4 py-3 text-muted-foreground">Extra fisso 10 € + 0,50 € ogni 3 litri</td>
                      <td className="px-4 py-3 text-muted-foreground">Costi elevati di gestione esclusiva di ordini acqua</td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">Spesa minima</td>
                      <td className="px-4 py-3 text-muted-foreground">Minimo 25 €</td>
                      <td className="px-4 py-3 text-muted-foreground">-</td>
                      <td className="px-4 py-3 text-muted-foreground">Sostenibilità e copertura costi fissi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Problem Management */}
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl">
                <AlertCircle className="h-6 w-6 text-yellow-700 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Gestione Problemi</h3>
              </div>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">Ritardo &gt;15 min →</span>
                <span>Notifica automatica a backup shopper + comunicazione cliente</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">Prodotti mancanti o errore ordine →</span>
                <span>Gestione rimborso / consegna sostitutiva entro 24h</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">Reclami ripetitivi →</span>
                <span>Revisione formazione e, se necessario, sospensione temporanea dal servizio</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default HowItWorksPage;
