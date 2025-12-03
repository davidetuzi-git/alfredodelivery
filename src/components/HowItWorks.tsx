import { MessageSquare, ShoppingBasket, Truck, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Prepara la lista e controlla i prezzi",
    description: "Crea la tua lista della spesa e confronta i prezzi tra i supermercati disponibili",
    step: "01"
  },
  {
    icon: ShoppingBasket,
    title: "Conferma l'ordine",
    description: "Ricevi il preventivo, scegli supermercato e fascia oraria, e conferma il pagamento",
    step: "02"
  },
  {
    icon: Truck,
    title: "Un Alfredo fa la spesa per te",
    description: "Il nostro shopper seleziona con cura i tuoi prodotti e li porta a casa tua",
    step: "03"
  },
  {
    icon: CheckCircle,
    title: "Ricevi la spesa quando vuoi",
    description: "Verifica la spesa, lascia un feedback e goditi il tuo tempo risparmiato",
    step: "04"
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="mb-4">
            Come funziona <span className="text-primary">ALFREDO</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Quattro semplici passi per ricevere la tua spesa a domicilio
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-card rounded-2xl p-8 h-full shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-2 border border-border">
                {/* Step number */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-[var(--shadow-glow)]">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-secondary" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
