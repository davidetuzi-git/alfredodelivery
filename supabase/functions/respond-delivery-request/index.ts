import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      // Assign order to this deliverer
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          deliverer_id: notification.deliverers.id,
          deliverer_name: notification.deliverers.name,
          deliverer_phone: notification.deliverers.phone,
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

      // Check if deliverer has other orders in the same date and time slot
      const currentOrderDate = new Date(notification.orders.delivery_date).toISOString().split('T')[0];
      const currentTimeSlot = notification.orders.time_slot;

      const { data: sameSlotOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("deliverer_id", notification.deliverers.id)
        .gte("delivery_date", currentOrderDate + "T00:00:00Z")
        .lte("delivery_date", currentOrderDate + "T23:59:59Z")
        .eq("time_slot", currentTimeSlot)
        .neq("id", notification.order_id);

      const hasSameSlotOrders = sameSlotOrders && sameSlotOrders.length > 0;

      // Update deliverer status - busy only if has orders in same date/time slot
      await supabase
        .from("deliverers")
        .update({
          current_orders: notification.deliverers.current_orders + 1,
          status: hasSameSlotOrders || (notification.deliverers.current_orders + 1 >= notification.deliverers.max_orders) ? "busy" : "available",
        })
        .eq("id", notification.deliverers.id);

      // Reject all other pending notifications for this order
      await supabase
        .from("delivery_notifications")
        .update({
          status: "expired",
          responded_at: new Date().toISOString(),
        })
        .eq("order_id", notification.order_id)
        .eq("status", "sent")
        .neq("id", notification_id);

      // Generate redirect URL with auth token via magic link function
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const redirectUrl = authToken 
        ? `${supabaseUrl}/functions/v1/deliverer-magic-link?token=${authToken}&apikey=${anonKey}`
        : `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/deliverer-auth`;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl
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
