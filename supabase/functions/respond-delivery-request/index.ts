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
    const url = new URL(req.url);
    const notification_id = url.searchParams.get("notification_id");
    const response = url.searchParams.get("response"); // 'accept' or 'reject'
    const authToken = url.searchParams.get("token"); // One-time auth token

    if (!notification_id || !response) {
      throw new Error("Missing parameters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from("delivery_notifications")
      .select("*, deliverers(*), orders(*)")
      .eq("id", notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error("Notification not found");
    }

    // Check if order is already assigned
    const { data: order } = await supabase
      .from("orders")
      .select("deliverer_id")
      .eq("id", notification.order_id)
      .single();

    if (order?.deliverer_id) {
      // Order already assigned
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ordine già assegnato</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f6f9fc;
              }
              .container {
                background: white;
                padding: 48px;
                border-radius: 16px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #f59e0b; font-size: 48px; margin: 0 0 24px 0; }
              p { color: #666; font-size: 18px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️</h1>
              <h2>Ordine già assegnato</h2>
              <p>Ci dispiace, questo ordine è già stato preso in carico da un altro deliverer.</p>
            </div>
          </body>
        </html>
        `,
        { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }

    if (response === "accept") {
      // Assign order to this deliverer and update status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          deliverer_id: notification.deliverers.id,
          deliverer_name: notification.deliverers.name,
          deliverer_phone: notification.deliverers.phone,
          delivery_status: 'assigned',
          status: 'assigned'
        })
        .eq("id", notification.order_id);

      if (updateError) {
        throw updateError;
      }

      // Update notification status
      await supabase
        .from("delivery_notifications")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", notification_id);

      // Update current_orders count only, status remains "available" 
      // (will be determined by time-based logic in frontend)
      await supabase
        .from("deliverers")
        .update({
          current_orders: notification.deliverers.current_orders + 1,
        })
        .eq("id", notification.deliverers.id);

      // Reject all other pending notifications for this order
      const { data: allNotifications } = await supabase
        .from("delivery_notifications")
        .select("*")
        .eq("order_id", notification.order_id)
        .eq("status", "sent");

      // Update all notifications to expired and remove buttons from Telegram messages
      for (const notif of allNotifications || []) {
        if (notif.id !== notification_id) {
          // Update notification status
          await supabase
            .from("delivery_notifications")
            .update({
              status: "expired",
              responded_at: new Date().toISOString(),
            })
            .eq("id", notif.id);

          // Remove buttons from Telegram message
          if (notif.telegram_chat_id && notif.telegram_message_id) {
            try {
              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: notif.telegram_chat_id,
                    message_id: parseInt(notif.telegram_message_id),
                    reply_markup: {
                      inline_keyboard: []
                    }
                  }),
                }
              );
            } catch (error) {
              console.error("Failed to remove Telegram buttons:", error);
            }
          }
        }
      }

      // Also remove buttons from the accepted notification's message
      if (notification.telegram_chat_id && notification.telegram_message_id) {
        try {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: notification.telegram_chat_id,
                message_id: parseInt(notification.telegram_message_id),
                reply_markup: {
                  inline_keyboard: []
                }
              }),
            }
          );
        } catch (error) {
          console.error("Failed to remove Telegram buttons:", error);
        }
      }

      // Redirect to deliverer auth page
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': 'https://alfredodelivery.lovable.app/deliverer/auth'
        }
      });
    } else {
      // Reject
      await supabase
        .from("delivery_notifications")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
        })
        .eq("id", notification_id);

      // Remove buttons from the rejected notification's Telegram message
      if (notification.telegram_chat_id && notification.telegram_message_id) {
        try {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: notification.telegram_chat_id,
                message_id: parseInt(notification.telegram_message_id),
                reply_markup: {
                  inline_keyboard: []
                }
              }),
            }
          );
        } catch (error) {
          console.error("Failed to remove Telegram buttons:", error);
        }
      }

      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Consegna rifiutata</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f6f9fc;
              }
              .container {
                background: white;
                padding: 48px;
                border-radius: 16px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #ef4444; font-size: 48px; margin: 0 0 24px 0; }
              p { color: #666; font-size: 18px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌</h1>
              <h2>Consegna rifiutata</h2>
              <p>Hai rifiutato questa consegna. Riceverai nuove opportunità presto!</p>
            </div>
          </body>
        </html>
        `,
        { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }
  } catch (error: any) {
    console.error("Error in respond-delivery-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
