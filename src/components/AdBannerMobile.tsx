import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Ad {
  id: string;
  storeName: string;
  title: string;
  discount?: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

const sampleAds: Ad[] = [
  {
    id: "esselunga-offerta-speciale",
    storeName: "Esselunga",
    title: "Sconto 30% freschi",
    discount: "-30%",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-800 dark:text-red-200",
    accentColor: "bg-red-600"
  },
  {
    id: "conad-promo-weekend",
    storeName: "Conad",
    title: "2x1 pasta e conserve",
    discount: "2x1",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    textColor: "text-orange-800 dark:text-orange-200",
    accentColor: "bg-orange-500"
  },
  {
    id: "carrefour-sottocosto",
    storeName: "Carrefour",
    title: "100+ prodotti sottocosto",
    discount: "-50%",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-800 dark:text-blue-200",
    accentColor: "bg-blue-600"
  },
  {
    id: "lidl-settimana-italiana",
    storeName: "Lidl",
    title: "Specialità regionali",
    discount: "-25%",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    textColor: "text-yellow-800 dark:text-yellow-200",
    accentColor: "bg-yellow-500"
  },
  {
    id: "eurospin-spesa-intelligente",
    storeName: "Eurospin",
    title: "Risparmia 40%",
    discount: "-40%",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-800 dark:text-green-200",
    accentColor: "bg-green-600"
  },
  {
    id: "coop-soci-in-festa",
    storeName: "Coop",
    title: "Punti doppi",
    discount: "x2",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    textColor: "text-purple-800 dark:text-purple-200",
    accentColor: "bg-purple-600"
  }
];

export const AdBannerMobile = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef<Set<string>>(new Set());
  const [isDismissed, setIsDismissed] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check if dismissed in session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('ad_banner_dismissed');
    if (dismissed) setIsDismissed(true);
  }, []);

  // Track impressions
  useEffect(() => {
    if (isDismissed) return;
    
    const trackImpressions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      for (const ad of sampleAds) {
        if (trackedRef.current.has(ad.id)) continue;
        
        try {
          await supabase
            .from('ad_impressions')
            .upsert(
              { ad_id: ad.id, user_id: session.user.id },
              { onConflict: 'ad_id,user_id', ignoreDuplicates: true }
            );
          trackedRef.current.add(ad.id);
        } catch (error) {
          // Ignore
        }
      }
    };

    trackImpressions();
  }, [isDismissed]);

  const handleAdClick = async (adId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    try {
      await supabase
        .from('ad_clicks')
        .insert({ ad_id: adId, user_id: session.user.id });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('ad_banner_dismissed', 'true');
  };

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons);
      return () => ref.removeEventListener('scroll', updateScrollButtons);
    }
  }, []);

  if (isDismissed) return null;

  return (
    <div className="xl:hidden relative bg-muted/30 border-y border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Offerte Partner
        </span>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Chiudi banner"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable ads */}
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/90 shadow-md rounded-full flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sampleAds.map((ad) => (
            <div
              key={ad.id}
              onClick={() => handleAdClick(ad.id)}
              className={`${ad.bgColor} flex-shrink-0 w-[140px] rounded-lg p-2.5 border border-border/30 cursor-pointer active:scale-95 transition-transform`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-semibold ${ad.textColor} truncate`}>
                  {ad.storeName}
                </span>
                {ad.discount && (
                  <span className={`${ad.accentColor} text-white text-[10px] font-bold px-1 py-0.5 rounded`}>
                    {ad.discount}
                  </span>
                )}
              </div>
              <p className={`text-xs font-medium ${ad.textColor} line-clamp-2`}>
                {ad.title}
              </p>
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/90 shadow-md rounded-full flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
