import { Clock, Shield, Heart, TrendingDown } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Risparmia tempo",
    description: "Dedica il tuo tempo a ciò che ami, ci pensiamo noi alla spesa",
    color: "primary"
  },
  {
    icon: Shield,
    title: "Affidabile e sicuro",
    description: "Servizio tracciato, pagamento sicuro e consegna garantita",
    color: "secondary"
  },
  {
    icon: Heart,
    title: "Prodotti freschi",
    description: "Selezioniamo con cura ogni prodotto dai tuoi negozi di fiducia",
    color: "primary"
  },
  {
    icon: TrendingDown,
    title: "Prezzi trasparenti",
    description: "Fee di servizio chiara, nessun costo nascosto o sorpresa",
    color: "secondary"
  }
];

export const Benefits = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="mb-4">
            Perché scegliere <span className="text-secondary">ALFREDO</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Un servizio pensato per rendere la tua vita più semplice
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-center space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-2xl bg-${benefit.color}/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[var(--shadow-soft)]`}>
                  <benefit.icon className={`w-10 h-10 text-${benefit.color}`} />
                </div>
                
                <h3 className="text-xl">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
