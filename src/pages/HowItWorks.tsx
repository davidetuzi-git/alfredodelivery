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
  Package
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

      <Navigation />
    </div>
  );
};

export default HowItWorksPage;
