import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  plan: "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  deliveries_remaining: number;
  deliveries_total: number;
  price_paid: number;
  started_at: string;
  expires_at: string;
  cancelled_at: string | null;
}

export interface SubscriptionBenefits {
  hasActiveSubscription: boolean;
  pickingFeePerProduct: number; // €0.15 default, €0.12 monthly, €0.10 yearly
  hasPriority: boolean;
  hasUrgentDelivery: boolean;
  deliveriesRemaining: number;
  plan: "monthly" | "yearly" | null;
}

const DEFAULT_PICKING_FEE = 0.15;
const MONTHLY_PICKING_FEE = 0.12;
const YEARLY_PICKING_FEE = 0.10;

export const SUBSCRIPTION_PLANS = {
  monthly: {
    name: "Base",
    price: 39.90,
    deliveries: 5,
    pickingFee: MONTHLY_PICKING_FEE,
    benefits: [
      "5 consegne incluse al mese",
      "Product picking a €0,12/prodotto (anziché €0,15)",
      "Priorità nell'evasione ordini",
      "Reminder automatici acquisti",
      "Cashback programma fedeltà"
    ]
  },
  yearly: {
    name: "Plus",
    price: 429.90,
    deliveries: 50,
    pickingFee: YEARLY_PICKING_FEE,
    benefits: [
      "50 consegne incluse all'anno",
      "Product picking a €0,10/prodotto",
      "Priorità nell'evasione ordini",
      "Consegne urgenti senza costi extra",
      "Servizi extra personalizzati",
      "Reminder automatici acquisti",
      "Cashback programma fedeltà"
    ]
  }
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState<SubscriptionBenefits>({
    hasActiveSubscription: false,
    pickingFeePerProduct: DEFAULT_PICKING_FEE,
    hasPriority: false,
    hasUrgentDelivery: false,
    deliveriesRemaining: 0,
    plan: null
  });

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if subscription is expired
        const isExpired = new Date(data.expires_at) < new Date();
        
        if (isExpired) {
          // Mark as expired
          await supabase
            .from("user_subscriptions")
            .update({ status: "expired" })
            .eq("id", data.id);
          
          setSubscription(null);
          setBenefits({
            hasActiveSubscription: false,
            pickingFeePerProduct: DEFAULT_PICKING_FEE,
            hasPriority: false,
            hasUrgentDelivery: false,
            deliveriesRemaining: 0,
            plan: null
          });
        } else {
          const sub = data as unknown as Subscription;
          setSubscription(sub);
          setBenefits({
            hasActiveSubscription: true,
            pickingFeePerProduct: sub.plan === "yearly" ? YEARLY_PICKING_FEE : MONTHLY_PICKING_FEE,
            hasPriority: true,
            hasUrgentDelivery: sub.plan === "yearly",
            deliveriesRemaining: sub.deliveries_remaining,
            plan: sub.plan
          });
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const decrementDelivery = async () => {
    if (!subscription || subscription.deliveries_remaining <= 0) return false;

    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ deliveries_remaining: subscription.deliveries_remaining - 1 })
        .eq("id", subscription.id);

      if (error) throw error;
      
      await loadSubscription();
      return true;
    } catch (error) {
      console.error("Error decrementing delivery:", error);
      return false;
    }
  };

  return {
    subscription,
    benefits,
    loading,
    refreshSubscription: loadSubscription,
    decrementDelivery
  };
}
