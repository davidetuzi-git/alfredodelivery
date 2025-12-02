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
  ordersToNextLevel: number | null;
}

export const LOYALTY_LEVELS = {
  bronze: {
    name: 'Bronzo',
    minOrders: 0,
    maxOrders: 4,
    deliveryDiscount: 0,
    color: 'from-amber-600 to-amber-800',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    icon: '🥉',
    benefits: ['1 punto per ogni € speso', 'Accesso promozioni base'],
  },
  silver: {
    name: 'Argento',
    minOrders: 5,
    maxOrders: 9,
    deliveryDiscount: 5,
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: '🥈',
    benefits: ['5% sconto consegna', '1.5 punti per € speso', 'Reminder automatici'],
  },
  gold: {
    name: 'Oro',
    minOrders: 10,
    maxOrders: null,
    deliveryDiscount: 10,
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: '🥇',
    benefits: ['10% sconto consegna', '2 punti per € speso', 'Cashback speciali', 'Accesso prioritario offerte'],
  },
  platinum: {
    name: 'Platino',
    minOrders: 10,
    maxOrders: null,
    deliveryDiscount: 15,
    color: 'from-purple-400 to-purple-700',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '💎',
    benefits: ['15% sconto consegna', '3 punti per € speso', 'Servizi esclusivi', 'Priorità massima', 'Offerte VIP'],
  },
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
    const monthlyOrders = loyaltyProfile?.monthly_orders_count || 0;
    
    const benefits: LoyaltyBenefits = {
      deliveryDiscount: LOYALTY_LEVELS[level].deliveryDiscount,
      hasAutomaticReminders: level !== 'bronze',
      hasCashback: level === 'gold' || level === 'platinum',
      hasPriorityAccess: level === 'gold' || level === 'platinum',
      hasExclusiveOffers: level === 'platinum',
      pointsPerEuro: level === 'bronze' ? 1 : level === 'silver' ? 1.5 : level === 'gold' ? 2 : 3,
      nextLevelThreshold: null,
      ordersToNextLevel: null,
    };

    // Calculate orders to next level
    if (level === 'bronze') {
      benefits.nextLevelThreshold = 5;
      benefits.ordersToNextLevel = 5 - monthlyOrders;
    } else if (level === 'silver') {
      benefits.nextLevelThreshold = 10;
      benefits.ordersToNextLevel = 10 - monthlyOrders;
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
  };
}
