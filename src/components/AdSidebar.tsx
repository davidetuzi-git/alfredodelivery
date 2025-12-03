import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  storeName: string;
  title: string;
  description: string;
  discount?: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

const sampleAds: Ad[] = [
  {
    id: "esselunga-offerta-speciale",
    storeName: "Esselunga",
    title: "Offerta Speciale",
    description: "Sconto 30% su tutti i prodotti freschi",
    discount: "-30%",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-800 dark:text-red-200",
    accentColor: "bg-red-600"
  },
  {
    id: "conad-promo-weekend",
    storeName: "Conad",
    title: "Promo Weekend",
    description: "2x1 su pasta e conserve",
    discount: "2x1",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    textColor: "text-orange-800 dark:text-orange-200",
    accentColor: "bg-orange-500"
  },
  {
    id: "carrefour-sottocosto",
    storeName: "Carrefour",
    title: "Sottocosto",
    description: "Oltre 100 prodotti in offerta",
    discount: "-50%",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-800 dark:text-blue-200",
    accentColor: "bg-blue-600"
  },
  {
    id: "lidl-settimana-italiana",
    storeName: "Lidl",
    title: "Settimana Italiana",
    description: "Specialità regionali a prezzi speciali",
    discount: "-25%",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    textColor: "text-yellow-800 dark:text-yellow-200",
    accentColor: "bg-yellow-500"
  },
  {
    id: "eurospin-spesa-intelligente",
    storeName: "Eurospin",
    title: "Spesa Intelligente",
    description: "Risparmia fino al 40% sulla spesa",
    discount: "-40%",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-800 dark:text-green-200",
    accentColor: "bg-green-600"
  },
  {
    id: "coop-soci-in-festa",
    storeName: "Coop",
    title: "Soci in Festa",
    description: "Punti doppi su tutta la spesa",
    discount: "x2",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    textColor: "text-purple-800 dark:text-purple-200",
    accentColor: "bg-purple-600"
  }
];

interface AdSidebarProps {
  position: 'left' | 'right';
}

export const AdSidebar = ({ position }: AdSidebarProps) => {
  const trackedRef = useRef<Set<string>>(new Set());
  
  // Show different ads based on position
  const ads = position === 'left' 
    ? sampleAds.filter((_, i) => i % 2 === 0) 
    : sampleAds.filter((_, i) => i % 2 === 1);

  // Track unique impressions
  useEffect(() => {
    const trackImpressions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      for (const ad of ads) {
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
          // Ignore duplicate errors
        }
      }
    };

    trackImpressions();
  }, [ads]);

  // Track click
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

  return (
    <div className="hidden xl:flex flex-col gap-4 w-[200px] flex-shrink-0">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 text-center">
        Offerte Partner
      </div>
      {ads.map((ad) => (
        <div
          key={ad.id}
          onClick={() => handleAdClick(ad.id)}
          className={`${ad.bgColor} rounded-lg p-3 border border-border/50 hover:shadow-md transition-shadow cursor-pointer group`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${ad.textColor}`}>
              {ad.storeName}
            </span>
            {ad.discount && (
              <span className={`${ad.accentColor} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>
                {ad.discount}
              </span>
            )}
          </div>
          <h4 className={`font-semibold text-sm ${ad.textColor} mb-1`}>
            {ad.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ad.description}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Scopri</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>
      ))}
    </div>
  );
};
