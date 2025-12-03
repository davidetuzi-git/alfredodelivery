import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LoyaltyLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyProfile {
  id: string;
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  current_level: LoyaltyLevel;
  monthly_orders_count: number;
  monthly_orders_reset_at: string;
  referral_code: string;
  created_at: string;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

export interface LoyaltyBenefits {
  deliveryDiscount: number; // percentage
  hasAutomaticReminders: boolean;
  hasCashback: boolean;
  hasPriorityAccess: boolean;
  hasExclusiveOffers: boolean;
  pointsPerEuro: number;
  nextLevelThreshold: number | null;
  pointsToNextLevel: number | null;
}

// Points-based level thresholds
export const LOYALTY_THRESHOLDS = {
  bronze: { min: 0, max: 149 },
  silver: { min: 150, max: 399 },
  gold: { min: 400, max: 999 },
  platinum: { min: 1000, max: null },
};

export const LOYALTY_LEVELS = {
  bronze: {
    name: 'Bronzo',
    minPoints: 0,
    maxPoints: 149,
    deliveryDiscount: 0,
    color: 'from-amber-600 to-amber-800',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    icon: '🥉',
    benefits: ['1 punto per ogni € speso', 'Accesso promozioni base'],
    validityMonths: 12,
  },
  silver: {
    name: 'Argento',
    minPoints: 150,
    maxPoints: 399,
    deliveryDiscount: 5,
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: '🥈',
    benefits: ['5% sconto consegna', '1.5 punti per € speso', 'Reminder automatici'],
    validityMonths: 12,
  },
  gold: {
    name: 'Oro',
    minPoints: 400,
    maxPoints: 999,
    deliveryDiscount: 10,
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: '🥇',
    benefits: ['10% sconto consegna', '2 punti per € speso', 'Cashback speciali', 'Accesso prioritario offerte'],
    validityMonths: 12,
  },
  platinum: {
    name: 'Platino',
    minPoints: 1000,
    maxPoints: null,
    deliveryDiscount: 15,
    color: 'from-purple-400 to-purple-700',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '💎',
    benefits: ['15% sconto consegna', '3 punti per € speso', 'Servizi esclusivi', 'Priorità massima', 'Offerte VIP'],
    validityMonths: 12,
  },
};

// Helper function to determine level based on points
export const getLevelFromPoints = (points: number): LoyaltyLevel => {
  if (points >= 1000) return 'platinum';
  if (points >= 400) return 'gold';
  if (points >= 150) return 'silver';
  return 'bronze';
};

export function useLoyalty() {
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load loyalty profile
      const { data: profile, error: profileError } = await supabase
        .from('loyalty_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading loyalty profile:', profileError);
      }

      if (profile) {
        setLoyaltyProfile(profile as unknown as LoyaltyProfile);
      } else {
        // Create profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('loyalty_profiles')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (!insertError && newProfile) {
          setLoyaltyProfile(newProfile as unknown as LoyaltyProfile);
        }
      }

      // Load recent transactions
      const { data: txns } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txns) {
        setTransactions(txns as unknown as PointsTransaction[]);
      }
    } catch (error) {
      console.error('Error in loadLoyaltyData:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBenefits = (level: LoyaltyLevel): LoyaltyBenefits => {
    const currentPoints = loyaltyProfile?.lifetime_points || 0;
    
    const benefits: LoyaltyBenefits = {
      deliveryDiscount: LOYALTY_LEVELS[level].deliveryDiscount,
      hasAutomaticReminders: level !== 'bronze',
      hasCashback: level === 'gold' || level === 'platinum',
      hasPriorityAccess: level === 'gold' || level === 'platinum',
      hasExclusiveOffers: level === 'platinum',
      pointsPerEuro: level === 'bronze' ? 1 : level === 'silver' ? 1.5 : level === 'gold' ? 2 : 3,
      nextLevelThreshold: null,
      pointsToNextLevel: null,
    };

    // Calculate points to next level
    if (level === 'bronze') {
      benefits.nextLevelThreshold = 150;
      benefits.pointsToNextLevel = Math.max(0, 150 - currentPoints);
    } else if (level === 'silver') {
      benefits.nextLevelThreshold = 400;
      benefits.pointsToNextLevel = Math.max(0, 400 - currentPoints);
    } else if (level === 'gold') {
      benefits.nextLevelThreshold = 1000;
      benefits.pointsToNextLevel = Math.max(0, 1000 - currentPoints);
    }

    return benefits;
  };

  const getPointsValue = (points: number): number => {
    // 100 points = €1
    return points / 100;
  };

  const refreshLoyalty = () => {
    loadLoyaltyData();
  };

  return {
    loyaltyProfile,
    transactions,
    loading,
    getBenefits,
    getPointsValue,
    refreshLoyalty,
    LOYALTY_LEVELS,
    getLevelFromPoints,
  };
}
