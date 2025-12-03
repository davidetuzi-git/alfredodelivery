import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Handshake, ArrowRight } from "lucide-react";
import bannerZoneImg from "@/assets/banner-zone-expansion.jpg";
import bannerPartnerImg from "@/assets/banner-partnership.jpg";

const banners = [
  {
    id: "zone-expansion",
    icon: MapPin,
    title: "Il nostro servizio non copre ancora la tua zona?",
    description: "Segnalacelo! Siamo costantemente alla ricerca di nuove aree in cui espandere il servizio. La tua richiesta ci aiuta a capire dove c'è maggiore interesse.",
    buttonText: "Richiedi Servizio nella tua Zona",
    note: "Ti contatteremo appena il servizio sarà disponibile nella tua area",
    route: "/richiedi-zona",
    bgImage: bannerZoneImg,
    overlayColor: "from-green-50/95 via-green-50/90 to-green-100/80 dark:from-green-950/95 dark:via-green-950/90 dark:to-green-900/80",
    iconBgColor: "bg-green-500",
    iconColor: "text-white",
    buttonColor: "bg-green-500 hover:bg-green-600 text-white"
  },
  {
    id: "supermarket-partner",
    icon: Handshake,
    title: "Sei un supermercato e vuoi il nostro servizio?",
    description: "Collabora con Alfredo! Offriamo una partnership vantaggiosa per espandere la tua clientela con consegne rapide e affidabili nella tua zona.",
    buttonText: "Richiedi Partnership",
    note: "Ti contatteremo per discutere i dettagli della collaborazione",
    route: "/partnership-supermercati",
    bgImage: bannerPartnerImg,
    overlayColor: "from-blue-50/95 via-blue-50/90 to-blue-100/80 dark:from-blue-950/95 dark:via-blue-950/90 dark:to-blue-900/80",
    iconBgColor: "bg-blue-500",
    iconColor: "text-white",
    buttonColor: "bg-blue-500 hover:bg-blue-600 text-white"
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
      }, 400);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const currentBanner = banners[currentIndex];
  const Icon = currentBanner.icon;

  const handleDotClick = (index: number) => {
    if (index === currentIndex) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
    }, 400);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 shadow-sm">
      {/* Background Image */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundImage: `url(${currentBanner.bgImage})` }}
      />
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-b ${currentBanner.overlayColor} transition-colors duration-500`} />

      <div 
        className={`relative py-10 px-6 text-center transition-all duration-400 ${
          isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
        }`}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`h-14 w-14 rounded-full ${currentBanner.iconBgColor} flex items-center justify-center shadow-lg`}>
            <Icon className={`h-7 w-7 ${currentBanner.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 max-w-xl mx-auto">
          {currentBanner.title}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto mb-6">
          {currentBanner.description}
        </p>

        {/* CTA Button */}
        <Button 
          size="lg"
          onClick={() => navigate(currentBanner.route)}
          className={`${currentBanner.buttonColor} shadow-lg hover:shadow-xl transition-all px-6 md:px-8 py-5 md:py-6 text-sm md:text-base font-semibold`}
        >
          <Icon className="h-5 w-5 mr-2" />
          {currentBanner.buttonText}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>

        {/* Note */}
        <p className="text-xs text-muted-foreground mt-5">
          {currentBanner.note}
        </p>

        {/* Indicator dots */}
        <div className="flex justify-center gap-2 mt-6">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Vai al banner ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
