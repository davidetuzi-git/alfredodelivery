import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  deliverer_id: string;
  order_id: string;
  rating?: number;
}

const sendTelegramMessage = async (chatId: string, message: string) => {
  console.log(`[NOTIFY-COMPLETE] Sending Telegram to ${chatId}`);
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    }
  );
  const result = await response.json();
  console.log(`[NOTIFY-COMPLETE] Telegram response:`, JSON.stringify(result));
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deliverer_id, order_id, rating } = await req.json() as NotifyRequest;
    console.log(`[NOTIFY-COMPLETE] Request received:`, { deliverer_id, order_id, rating });

    if (!deliverer_id) {
      throw new Error("deliverer_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get deliverer info
    const { data: deliverer, error: delivererError } = await supabase
      .from("deliverers")
      .select("*")
      .eq("id", deliverer_id)
      .single();

    if (delivererError || !deliverer) {
      console.error(`[NOTIFY-COMPLETE] Deliverer not found:`, delivererError);
      throw new Error("Deliverer not found");
    }

    console.log(`[NOTIFY-COMPLETE] Deliverer:`, deliverer.name, "chat_id:", deliverer.telegram_chat_id);

    if (!deliverer.telegram_chat_id) {
      console.log(`[NOTIFY-COMPLETE] No Telegram chat_id for deliverer`);
      return new Response(
        JSON.stringify({ success: false, reason: "No telegram_chat_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get completed order info
    const { data: completedOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    console.log(`[NOTIFY-COMPLETE] Completed order:`, completedOrder?.store_name);

    // Get upcoming scheduled orders for this deliverer
    const today = new Date().toISOString().split('T')[0];
    const { data: upcomingOrders } = await supabase
      .from("orders")
      .select("id, store_name, delivery_date, time_slot, delivery_address")
      .eq("deliverer_id", deliverer_id)
      .in("delivery_status", ["confirmed", "assigned", "at_store", "shopping_complete"])
      .gte("delivery_date", today)
      .order("delivery_date", { ascending: true });

    const scheduledCount = upcomingOrders?.length || 0;
    console.log(`[NOTIFY-COMPLETE] Upcoming orders:`, scheduledCount);

    // Find nearby available orders if no scheduled orders
    let nearbyOrders: any[] = [];
    if (scheduledCount === 0 && deliverer.latitude && deliverer.longitude) {
      // Get orders without deliverer assigned in the same zone
      const { data: availableOrders } = await supabase
        .from("orders")
        .select("id, store_name, delivery_date, time_slot, delivery_address, latitude, longitude")
        .is("deliverer_id", null)
        .in("delivery_status", ["confirmed"])
        .gte("delivery_date", today)
        .order("delivery_date", { ascending: true })
        .limit(10);

      // Filter by distance (within operating radius)
      const operatingRadius = deliverer.operating_radius_km || 7;
      nearbyOrders = (availableOrders || []).filter((order) => {
        if (!order.latitude || !order.longitude) return false;
        const distance = calculateDistance(
          deliverer.latitude,
          deliverer.longitude,
          order.latitude,
          order.longitude
        );
        return distance <= operatingRadius;
      }).slice(0, 3);

      console.log(`[NOTIFY-COMPLETE] Nearby available orders:`, nearbyOrders.length);
    }

    // Build the message
    let message = `🎉 *Consegna completata!*\n\n`;
    message += `Grazie ${deliverer.name.split(' ')[0]} per aver completato la consegna`;
    
    if (completedOrder) {
      message += ` da *${completedOrder.store_name}*`;
    }
    message += `!\n\n`;

    // Congratulations for 5 stars
    if (rating === 5) {
      message += `⭐⭐⭐⭐⭐ *FANTASTICO!*\n`;
      message += `Il cliente ti ha dato 5 stelle! Complimenti per l'ottimo lavoro, continua così! 🏆\n\n`;
    } else if (rating && rating >= 4) {
      message += `⭐ Il cliente ti ha dato ${rating} stelle. Ottimo lavoro!\n\n`;
    }

    // Upcoming scheduled orders
    if (scheduledCount > 0) {
      message += `📋 *Ordini programmati:* ${scheduledCount}\n`;
      upcomingOrders?.slice(0, 3).forEach((order, index) => {
        const orderDate = new Date(order.delivery_date);
        const dateStr = orderDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        message += `  ${index + 1}. ${order.store_name} - ${dateStr} ${order.time_slot}\n`;
      });
      if (scheduledCount > 3) {
        message += `  ... e altri ${scheduledCount - 3}\n`;
      }
      message += `\n`;
    } else {
      message += `📋 Nessun ordine programmato al momento.\n\n`;
    }

    // Suggest nearby orders
    if (nearbyOrders.length > 0) {
      message += `💡 *Nuove consegne disponibili nella tua zona:*\n`;
      nearbyOrders.forEach((order, index) => {
        const orderDate = new Date(order.delivery_date);
        const dateStr = orderDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        const distance = calculateDistance(
          deliverer.latitude,
          deliverer.longitude,
          order.latitude,
          order.longitude
        ).toFixed(1);
        message += `  📍 ${order.store_name} - ${dateStr} (~${distance}km)\n`;
      });
      message += `\nAccedi alla dashboard per accettare nuovi ordini!`;
    } else if (scheduledCount === 0) {
      message += `Nessun nuovo ordine disponibile al momento nella tua zona. Ti avviseremo appena ce ne saranno!`;
    }

    // Send the message
    const result = await sendTelegramMessage(deliverer.telegram_chat_id, message);

    return new Response(
      JSON.stringify({ 
        success: result.ok, 
        message_sent: message,
        scheduled_orders: scheduledCount,
        nearby_orders: nearbyOrders.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[NOTIFY-COMPLETE] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

serve(handler);
