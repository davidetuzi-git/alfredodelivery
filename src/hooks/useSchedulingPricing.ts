import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, differenceInDays, isToday, isTomorrow, startOfDay, format } from "date-fns";

export interface SchedulingAdjustment {
  amount: number;
  type: 'surcharge' | 'discount';
  label: string;
  description: string;
}

export interface SuggestedDate {
  date: Date;
  reason: string;
  extraDiscount: number;
}

interface NearbyOrder {
  delivery_date: string;
  store_name: string;
  delivery_address: string;
  latitude: number | null;
  longitude: number | null;
}

// Calculate distance between two coordinates in km (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateSchedulingAdjustment = (
  deliveryDate: Date | undefined,
  orderTime: Date = new Date()
): SchedulingAdjustment | null => {
  if (!deliveryDate) return null;

  const now = orderTime;
  const currentHour = now.getHours();
  const deliveryDay = startOfDay(deliveryDate);
  const today = startOfDay(now);
  
  const hoursUntilDelivery = differenceInHours(deliveryDay, now);
  const daysUntilDelivery = differenceInDays(deliveryDay, today);

  // Same day delivery - +€5 surcharge (only guaranteed if ordered before 11:00)
  if (isToday(deliveryDate)) {
    if (currentHour < 11) {
      return {
        amount: 5,
        type: 'surcharge',
        label: '+€5,00',
        description: 'Consegna urgente oggi (ordine entro le 11:00)'
      };
    } else {
      // After 11:00, same day is not guaranteed
      return {
        amount: 5,
        type: 'surcharge',
        label: '+€5,00',
        description: 'Consegna urgente oggi (non garantita dopo le 11:00)'
      };
    }
  }

  // Next day delivery
  if (isTomorrow(deliveryDate)) {
    if (currentHour < 11) {
      return {
        amount: -0.80,
        type: 'discount',
        label: '-€0,80',
        description: 'Sconto consegna domani (ordine entro le 11:00)'
      };
    } else if (currentHour < 17) {
      return {
        amount: -0.50,
        type: 'discount',
        label: '-€0,50',
        description: 'Sconto consegna domani (ordine entro le 17:00)'
      };
    }
    // After 17:00, no discount for next day
    return null;
  }

  // 5+ days in advance - €3.00 discount
  if (daysUntilDelivery >= 5) {
    return {
      amount: -3.00,
      type: 'discount',
      label: '-€3,00',
      description: 'Sconto programmazione anticipata (5+ giorni)'
    };
  }

  // 72+ hours (3+ days) in advance - €1.50 discount
  if (daysUntilDelivery >= 3) {
    return {
      amount: -1.50,
      type: 'discount',
      label: '-€1,50',
      description: 'Sconto programmazione anticipata (72+ ore)'
    };
  }

  // 48+ hours (2+ days) in advance - €1.00 discount
  if (daysUntilDelivery >= 2) {
    return {
      amount: -1.00,
      type: 'discount',
      label: '-€1,00',
      description: 'Sconto programmazione anticipata (48+ ore)'
    };
  }

  return null;
};

export const useSchedulingPricing = (
  storeName: string,
  deliveryLatitude: number | null,
  deliveryLongitude: number | null
) => {
  const [suggestedDates, setSuggestedDates] = useState<SuggestedDate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNearbyOrders = async () => {
      if (!storeName || !deliveryLatitude || !deliveryLongitude) {
        setSuggestedDates([]);
        return;
      }

      setLoading(true);
      try {
        // Get the store chain name (e.g., "Conad" from "Conad - Via Roma 123")
        const storeChain = storeName.split(' - ')[0].trim();

        // Fetch upcoming orders from the same store chain within the next 14 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);

        const { data: orders, error } = await supabase
          .from('orders')
          .select('delivery_date, store_name, delivery_address, latitude, longitude')
          .gte('delivery_date', startDate.toISOString())
          .lte('delivery_date', endDate.toISOString())
          .in('delivery_status', ['confirmed', 'assigned'])
          .ilike('store_name', `${storeChain}%`);

        if (error) {
          console.error('Error fetching nearby orders:', error);
          setSuggestedDates([]);
          return;
        }

        if (!orders || orders.length === 0) {
          setSuggestedDates([]);
          return;
        }

        // Find orders that are nearby (within 2km)
        const nearbyOrderDates = new Map<string, { count: number; distance: number }>();

        orders.forEach((order: NearbyOrder) => {
          if (order.latitude && order.longitude) {
            const distance = calculateDistance(
              deliveryLatitude,
              deliveryLongitude,
              order.latitude,
              order.longitude
            );

            if (distance <= 2) { // Within 2km
              const dateKey = format(new Date(order.delivery_date), 'yyyy-MM-dd');
              const existing = nearbyOrderDates.get(dateKey);
              
              if (existing) {
                nearbyOrderDates.set(dateKey, {
                  count: existing.count + 1,
                  distance: Math.min(existing.distance, distance)
                });
              } else {
                nearbyOrderDates.set(dateKey, { count: 1, distance });
              }
            }
          }
        });

        // Convert to suggested dates with extra discounts
        const suggestions: SuggestedDate[] = [];
        nearbyOrderDates.forEach((value, dateKey) => {
          const date = new Date(dateKey);
          const daysUntil = differenceInDays(date, startOfDay(new Date()));
          
          // Only suggest dates that are at least 2 days away
          if (daysUntil >= 2) {
            // Extra discount for grouping: €0.50 base + €0.25 per additional nearby order
            const extraDiscount = 0.50 + (value.count - 1) * 0.25;
            
            suggestions.push({
              date,
              reason: value.count === 1 
                ? `C'è già una consegna programmata nelle vicinanze (${value.distance.toFixed(1)}km)`
                : `Ci sono ${value.count} consegne programmate nelle vicinanze`,
              extraDiscount: Math.min(extraDiscount, 1.50) // Cap at €1.50
            });
          }
        });

        // Sort by date
        suggestions.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        setSuggestedDates(suggestions);
      } catch (error) {
        console.error('Error in useSchedulingPricing:', error);
        setSuggestedDates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyOrders();
  }, [storeName, deliveryLatitude, deliveryLongitude]);

  return {
    calculateAdjustment: calculateSchedulingAdjustment,
    suggestedDates,
    loading
  };
};

export default useSchedulingPricing;
