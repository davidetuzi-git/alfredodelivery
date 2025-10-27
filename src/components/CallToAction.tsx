import { Button } from "@/components/ui/button";
import { MessageCircle, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CallToAction = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 -z-10" />
      <div className="absolute inset-0 bg-[var(--gradient-subtle)] -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-12 md:p-16 shadow-[var(--shadow-soft)] border border-border">
            <div className="text-center space-y-8">
              <h2 className="animate-slide-up">
                Inizia oggi con{" "}
                <span className="bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                  ALFREDO
                </span>
              </h2>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up">
                Unisciti a centinaia di clienti che hanno già scoperto la comodità 
                di ricevere la spesa a casa
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-slide-up">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="group"
                  onClick={() => navigate("/ordina")}
                >
                  <MessageCircle className="group-hover:rotate-12 transition-transform" />
                  Ordina Ora
                </Button>
                <Button variant="outline" size="lg" className="group">
                  <Smartphone className="group-hover:scale-110 transition-transform" />
                  Scarica l'app
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8 text-sm text-muted-foreground border-t border-border mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Nessun impegno
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full" />
                  Cancellazione gratuita
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  Supporto 7/7
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
