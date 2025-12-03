import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Handshake, ChevronRight } from "lucide-react";

const banners = [
  {
    id: "report-store",
    icon: Store,
    title: "Non trovi il tuo supermercato?",
    description: "Segnalacelo e lo aggiungeremo alla nostra rete!",
    buttonText: "Segnala",
    route: "/segnala-supermercato",
    bgGradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  {
    id: "supermarket-partner",
    icon: Handshake,
    title: "Sei un supermercato e vuoi il nostro servizio?",
    description: "Contattaci per una partnership vantaggiosa!",
    buttonText: "Contattaci",
    route: "/partnership-supermercati",
    bgGradient: "from-green-500/10 via-green-500/5 to-transparent",
    iconColor: "text-green-600 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800"
  }
];

export const SlidingPartnerBanners = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setIsAnimating(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentBanner = banners[currentIndex];
  const Icon = currentBanner.icon;

  return (
    <Card 
      className={`overflow-hidden border ${currentBanner.borderColor} transition-all duration-300`}
    >
      <CardContent 
        className={`p-4 bg-gradient-to-r ${currentBanner.bgGradient} transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-full bg-background/80 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-6 w-6 ${currentBanner.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm md:text-base leading-tight">
              {currentBanner.title}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {currentBanner.description}
            </p>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => navigate(currentBanner.route)}
            className="flex-shrink-0"
          >
            {currentBanner.buttonText}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {/* Indicator dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setIsAnimating(false);
                }, 300);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-4 bg-primary' 
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Vai al banner ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
