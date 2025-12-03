import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Handshake, ChevronRight } from "lucide-react";

const banners = [
  {
    id: "zone-expansion",
    icon: MapPin,
    title: "Il nostro servizio non copre ancora la tua zona?",
    description: "Richiedi l'attivazione del servizio nella tua area!",
    buttonText: "Richiedi Zona",
    route: "/richiedi-zona",
    bgGradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    iconColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800"
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
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideDirection(currentIndex === 0 ? 'left' : 'right');
      setIsSliding(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setIsSliding(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const currentBanner = banners[currentIndex];
  const Icon = currentBanner.icon;

  const getSlideClass = () => {
    if (!isSliding) return 'translate-x-0';
    return slideDirection === 'left' ? '-translate-x-full' : 'translate-x-full';
  };

  return (
    <Card 
      className={`overflow-hidden border ${currentBanner.borderColor} transition-colors duration-300`}
    >
      <CardContent className="p-0 relative overflow-hidden">
        <div 
          className={`p-4 bg-gradient-to-r ${currentBanner.bgGradient} transform transition-transform duration-500 ease-in-out ${getSlideClass()}`}
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
                  setSlideDirection(index > currentIndex ? 'left' : 'right');
                  setIsSliding(true);
                  setTimeout(() => {
                    setCurrentIndex(index);
                    setIsSliding(false);
                  }, 500);
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
        </div>
      </CardContent>
    </Card>
  );
};