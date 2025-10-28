import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
    
    console.log("Setting up Telegram webhook:", webhookUrl);

    // Set webhook
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      }
    );

    const data = await response.json();
    console.log("Telegram webhook setup result:", data);

    if (data.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook configurato con successo!",
          webhook_url: webhookUrl,
          bot_info: data
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(data.description || "Failed to set webhook");
    }
  } catch (error: any) {
    console.error("Error setting up webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
