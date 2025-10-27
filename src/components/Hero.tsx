import { Button } from "@/components/ui/button";
import { ShoppingCart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-delivery.jpg";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[var(--gradient-subtle)] -z-10" />
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="animate-slide-up space-y-8">
            <div className="inline-block">
              <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold border border-primary/20">
                🛒 Servizio di spesa a domicilio
              </span>
            </div>
            
            <h1 className="leading-tight">
              La tua spesa,{" "}
              <span className="bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
                consegnata con cura
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
              Ordina dai tuoi supermercati preferiti e ricevi tutto a casa. 
              ALFREDO si occupa di tutto: acquisto, ritiro e consegna a domicilio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="hero" size="lg" className="group" onClick={() => navigate("/home")}>
                <ShoppingCart className="group-hover:rotate-12 transition-transform" />
                Inizia ora
              </Button>
              <Button variant="secondary" size="lg" className="group" onClick={() => navigate("/ordina")}>
                <ShoppingCart className="group-hover:rotate-12 transition-transform" />
                Ordina subito
              </Button>
            </div>

            <div className="flex gap-8 pt-8">
              <div>
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Clienti felici</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary">50+</div>
                <div className="text-sm text-muted-foreground">Alfedi attivi</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">10+</div>
                <div className="text-sm text-muted-foreground">Supermercati partner</div>
              </div>
            </div>
          </div>

          {/* Right image */}
          <div className="relative lg:block hidden animate-float">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
            <img
              src={heroImage}
              alt="ALFREDO consegna la spesa a domicilio"
              className="relative rounded-3xl shadow-[var(--shadow-soft)] w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
