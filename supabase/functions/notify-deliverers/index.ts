import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyDeliverersRequest {
  order_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id }: NotifyDeliverersRequest = await req.json();
    console.log("Notifying deliverers for order:", order_id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (!order.latitude || !order.longitude) {
      throw new Error("Order location not set");
    }

    // Find available deliverers within 7km
    const { data: deliverers, error: deliverersError } = await supabase
      .from("deliverers")
      .select("*")
      .eq("status", "available")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (deliverersError) {
      throw deliverersError;
    }

    console.log(`Found ${deliverers?.length || 0} deliverers`);

    // Filter deliverers by distance
    const nearbyDeliverers: any[] = [];
    
    for (const deliverer of deliverers || []) {
      if (!deliverer.latitude || !deliverer.longitude) continue;

      const { data: distance } = await supabase.rpc("calculate_distance", {
        lat1: order.latitude,
        lon1: order.longitude,
        lat2: deliverer.latitude,
        lon2: deliverer.longitude,
      });

      const maxDistance = deliverer.operating_radius_km || 7;
      console.log(`Deliverer ${deliverer.name}: distance=${distance}km, max=${maxDistance}km, telegram=${deliverer.telegram_chat_id || 'none'}, willAdd=${!!(distance && distance <= maxDistance)}`);
      
      if (distance !== null && distance !== undefined && distance <= maxDistance) {
        nearbyDeliverers.push(deliverer);
      }
    }

    console.log(`Found ${nearbyDeliverers.length} nearby deliverers`);

    if (nearbyDeliverers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No deliverers available in the area" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send Telegram messages to all nearby deliverers
    const notificationPromises = nearbyDeliverers.map(async (deliverer) => {
      // Create notification record
      const { data: notification } = await supabase
        .from("delivery_notifications")
        .insert({
          order_id: order.id,
          deliverer_id: deliverer.id,
          status: "sent",
        })
        .select()
        .single();

      if (!notification) return;

      // Send Telegram message if chat_id is available
      if (deliverer.telegram_chat_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const acceptUrl = `${supabaseUrl}/functions/v1/respond-delivery-request?notification_id=${notification.id}&response=accept&apikey=${anonKey}`;
        const rejectUrl = `${supabaseUrl}/functions/v1/respond-delivery-request?notification_id=${notification.id}&response=reject&apikey=${anonKey}`;

        const message = `🚚 *Nuova Consegna Disponibile*

Ciao ${deliverer.name}!

C'è una nuova consegna disponibile nella tua zona:

🔑 *Codice Ritiro:* \`${order.pickup_code}\`
📅 *Data:* ${new Date(order.delivery_date).toLocaleDateString("it-IT")}
🕐 *Orario:* ${order.time_slot}
🏪 *Ritiro:* ${order.store_name}
📍 *Consegna:* ${order.delivery_address}

⚡ *Il primo che accetta riceverà l'ordine!*`;

        try {
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: deliverer.telegram_chat_id,
                text: message,
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: "✅ Accetta Consegna", url: acceptUrl },
                    ],
                    [
                      { text: "❌ Rifiuta", url: rejectUrl },
                    ],
                  ],
                },
              }),
            }
          );

          const telegramData = await telegramResponse.json();
          
          if (telegramData.ok) {
            console.log("Telegram message sent to", deliverer.name);
          } else {
            console.error("Error sending Telegram to", deliverer.name, telegramData);
          }
        } catch (error) {
          console.error("Failed to send Telegram message:", error);
        }
      } else {
        console.log("Deliverer", deliverer.name, "has no Telegram chat ID");
      }
    });

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, notified: nearbyDeliverers.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-deliverers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
