import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle /start command
    if (update.message?.text?.startsWith("/start")) {
      const chatId = update.message.chat.id;
      const username = update.message.from.username;
      const firstName = update.message.from.first_name;

      console.log(`Received /start from @${username} (${firstName}), chat_id: ${chatId}`);

      // Find deliverer by phone or email (assuming they registered first)
      // For now, we'll just send them their chat_id
      const message = `Ciao ${firstName}! 👋

Il tuo Chat ID è: \`${chatId}\`

Copia questo numero e salvalo nelle impostazioni della tua dashboard fattorino per ricevere notifiche automatiche su Telegram!`;

      await fetch(
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

      // Try to auto-link if we find a deliverer with this username
      if (username) {
        const { data: deliverer } = await supabase
          .from("deliverers")
          .select("*")
          .ilike("email", `%${username}%`)
          .single();

        if (deliverer) {
          await supabase
            .from("deliverers")
            .update({ telegram_chat_id: chatId.toString() })
            .eq("id", deliverer.id);

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "✅ Il tuo account è stato collegato automaticamente! Riceverai le notifiche delle consegne qui.",
              }),
            }
          );
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in telegram-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
