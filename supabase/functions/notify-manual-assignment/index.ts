import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, delivererId } = await req.json();

    if (!orderId || !delivererId) {
      return new Response(
        JSON.stringify({ error: "orderId and delivererId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get deliverer details
    const { data: deliverer, error: delivererError } = await supabase
      .from("deliverers")
      .select("*")
      .eq("id", delivererId)
      .single();

    if (delivererError || !deliverer || !deliverer.telegram_chat_id) {
      console.error("Error fetching deliverer:", delivererError);
      return new Response(
        JSON.stringify({ error: "Deliverer not found or has no Telegram chat ID" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format delivery date
    const deliveryDate = new Date(order.delivery_date);
    const formattedDate = deliveryDate.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Create notification message
    const message = `🔔 *Nuova consegna assegnata*\n\n` +
      `📦 Ordine: ${order.id.substring(0, 8)}\n` +
      `👤 Cliente: ${order.customer_name}\n` +
      `🏪 Supermercato: ${order.store_name}\n` +
      `📅 Consegna: ${formattedDate} ${order.time_slot}\n` +
      `💰 Totale: €${order.total_amount}\n\n` +
      `Clicca il pulsante qui sotto per visualizzare i dettagli completi.`;

    const delivererDashboardUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://alfredodelivery.lovable.app"}/deliverer-dashboard`;

    // Send Telegram notification
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
                {
                  text: "📱 Visualizza Ordine",
                  url: delivererDashboardUrl,
                },
              ],
            ],
          },
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return new Response(
        JSON.stringify({ error: "Failed to send Telegram notification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Manual assignment notification sent successfully to deliverer:", deliverer.name);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Notification sent successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-manual-assignment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
