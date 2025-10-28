import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
      if (distance && distance <= maxDistance) {
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

    // Send emails to all nearby deliverers
    const emailPromises = nearbyDeliverers.map(async (deliverer) => {
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

      const acceptUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/respond-delivery-request?notification_id=${notification.id}&response=accept`;
      const rejectUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/respond-delivery-request?notification_id=${notification.id}&response=reject`;
      
      // WhatsApp link with pre-filled message
      const whatsappMessage = encodeURIComponent(
        `Accetto la consegna per l'ordine del ${new Date(order.delivery_date).toLocaleDateString("it-IT")} alle ${order.time_slot}`
      );
      const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nuova Consegna Disponibile</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
              <h1 style="color: #333; font-size: 28px; margin-bottom: 24px;">🚚 Nuova Consegna Disponibile</h1>
              
              <p style="color: #333; font-size: 16px; margin-bottom: 16px;">Ciao ${deliverer.name}!</p>
              
              <p style="color: #333; font-size: 16px; margin-bottom: 24px;">
                C'è una nuova consegna disponibile nella tua zona. Ecco i dettagli:
              </p>

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
                <p style="margin: 8px 0; font-size: 15px;"><strong>📅 Data:</strong> ${new Date(order.delivery_date).toLocaleDateString("it-IT")}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>🕐 Orario:</strong> ${order.time_slot}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>🏪 Ritiro:</strong> ${order.store_name}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>📍 Consegna:</strong> ${order.delivery_address}</p>
              </div>

              <p style="color: #333; font-size: 16px; margin-bottom: 24px;">
                <strong>Il primo che accetta riceverà l'ordine!</strong>
              </p>

              <div style="margin: 24px 0;">
                <a href="${acceptUrl}" style="display: block; width: 100%; padding: 16px 0; margin-bottom: 12px; background-color: #22c55e; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  ✅ Accetta Consegna
                </a>
                <a href="${whatsappUrl}" style="display: block; width: 100%; padding: 16px 0; margin-bottom: 12px; background-color: #25D366; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  💬 Accetta su WhatsApp
                </a>
                <a href="${rejectUrl}" style="display: block; width: 100%; padding: 16px 0; background-color: #ef4444; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  ❌ Rifiuta
                </a>
              </div>

              <p style="color: #8898aa; font-size: 12px; margin-top: 24px;">
                Questa è una notifica automatica. Se non sei interessato, clicca su "Rifiuta".
              </p>
            </div>
          </body>
        </html>
      `;

      if (!deliverer.email) {
        console.log("Deliverer", deliverer.name, "has no email");
        return;
      }

      const { error: emailError } = await resend.emails.send({
        from: "Consegne <onboarding@resend.dev>",
        to: [deliverer.email],
        subject: "🚚 Nuova consegna disponibile",
        html,
      });

      if (emailError) {
        console.error("Error sending email to", deliverer.name, emailError);
      } else {
        console.log("Email sent to", deliverer.name);
      }
    });

    await Promise.all(emailPromises);

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
