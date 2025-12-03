import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ZoneExpansion = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Il nostro servizio non copre ancora la tua zona?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Segnalacelo! Siamo costantemente alla ricerca di nuove aree in cui espandere il servizio. 
            La tua richiesta ci aiuta a capire dove c'è maggiore interesse.
          </p>

          <Button 
            size="lg" 
            onClick={() => navigate("/richiedi-zona")}
            className="group"
          >
            <MapPin className="h-5 w-5 mr-2" />
            Richiedi Servizio nella tua Zona
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          <p className="mt-6 text-sm text-muted-foreground">
            Ti contatteremo appena il servizio sarà disponibile nella tua area
          </p>
        </div>
      </div>
    </section>
  );
};
