import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Keywords to detect alcohol products
const ALCOHOL_KEYWORDS = [
  // Vini
  'vino', 'wine', 'prosecco', 'champagne', 'spumante', 'chianti', 'barolo', 'amarone',
  'montepulciano', 'brunello', 'pinot', 'chardonnay', 'merlot', 'cabernet', 'sangiovese',
  'moscato', 'lambrusco', 'rosato', 'rosso', 'bianco',
  // Birre
  'birra', 'beer', 'lager', 'pils', 'pilsner', 'ale', 'ipa', 'stout', 'weiss',
  'peroni', 'moretti', 'heineken', 'corona', 'becks', 'nastro azzurro', 'ichnusa',
  // Superalcolici
  'vodka', 'whisky', 'whiskey', 'rum', 'gin', 'grappa', 'amaro', 'limoncello',
  'sambuca', 'liquore', 'cognac', 'brandy', 'tequila', 'aperol', 'campari',
  'spritz', 'martini', 'vermouth', 'fernet', 'jagermeister', 'baileys',
  'cointreau', 'grand marnier', 'kahlua', 'amaretto', 'mirto', 'nocino',
  // Termini generici
  'alcolico', 'alcolici', 'alcol', 'gradazione', 'distillato', 'distillati',
  'liquori', 'superalcolico', 'superalcolici', 'digestivo', 'aperitivo'
];

// Products to exclude (non-alcoholic variants)
const EXCLUDE_KEYWORDS = [
  'analcolico', 'analcolica', 'senza alcol', '0%', 'zero alcol', 'alcohol free',
  'aceto', 'vinaigrette', 'vino cotto', 'estratto'
];

export const containsAlcohol = (items: { name: string }[]): boolean => {
  return items.some(item => {
    const lowerName = item.name.toLowerCase();
    
    // Check if excluded
    if (EXCLUDE_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
      return false;
    }
    
    // Check if contains alcohol keyword
    return ALCOHOL_KEYWORDS.some(keyword => lowerName.includes(keyword));
  });
};

export const getAlcoholItems = (items: { name: string }[]): string[] => {
  return items
    .filter(item => {
      const lowerName = item.name.toLowerCase();
      if (EXCLUDE_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
        return false;
      }
      return ALCOHOL_KEYWORDS.some(keyword => lowerName.includes(keyword));
    })
    .map(item => item.name);
};

export const useAlcoholVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsVerified(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('alcohol_verified')
        .eq('id', user.id)
        .single();

      setIsVerified(profile?.alcohol_verified || false);
    } catch (error) {
      console.error('Error checking alcohol verification:', error);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshVerification = () => {
    setLoading(true);
    checkVerification();
  };

  return { isVerified, loading, refreshVerification };
};
