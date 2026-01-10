import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, delivererId, rating, comment, tipAmount, riderShare } = await req.json();

    console.log("Notify deliverer feedback:", { orderId, delivererId, rating, tipAmount });

    if (!orderId || !delivererId || !rating) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch deliverer info
    const { data: deliverer, error: delivererError } = await supabase
      .from("deliverers")
      .select("telegram_chat_id, name")
      .eq("id", delivererId)
      .single();

    if (delivererError || !deliverer) {
      console.error("Error fetching deliverer:", delivererError);
      return new Response(
        JSON.stringify({ error: "Deliverer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deliverer.telegram_chat_id || !telegramBotToken) {
      console.log("Telegram not configured for deliverer:", delivererId);
      return new Response(
        JSON.stringify({ success: true, message: "Telegram not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("pickup_code, customer_name")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
    }

    // Build Telegram message
    const stars = "⭐".repeat(rating);
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://preview--alfredo-spesa-per-te.lovable.app";
    const orderDetailUrl = `${appBaseUrl}/deliverer-order/${orderId}`;
    
    let message = `🎉 *Nuova recensione ricevuta!*\n\n`;
    message += `📦 Ordine: [${order?.pickup_code || orderId.substring(0, 8)}](${orderDetailUrl})\n`;
    message += `👤 Cliente: ${order?.customer_name || "Cliente"}\n\n`;
    message += `⭐ *Valutazione: ${stars} (${rating}/5)*\n`;
    
    if (comment) {
      message += `\n💬 *Commento:*\n_"${comment}"_\n`;
    }

    if (tipAmount && tipAmount > 0) {
      message += `\n💰 *Hai ricevuto una mancia!*\n`;
      message += `   Totale mancia: €${tipAmount.toFixed(2)}\n`;
      message += `   Il tuo guadagno (80%): €${riderShare.toFixed(2)} 🎉\n`;
    } else {
      message += `\n_Nessuna mancia questa volta_\n`;
    }

    message += `\n👉 [Vedi dettagli ordine](${orderDetailUrl})`;

    // Send Telegram message
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: deliverer.telegram_chat_id,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log("Telegram response:", telegramResult);

    if (!telegramResult.ok) {
      console.error("Telegram error:", telegramResult);
      return new Response(
        JSON.stringify({ error: "Failed to send Telegram message", details: telegramResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Feedback notification sent successfully to deliverer:", delivererId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-deliverer-feedback:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
