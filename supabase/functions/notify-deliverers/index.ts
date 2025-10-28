import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.25";
import { DeliveryRequestEmail } from "./_templates/delivery-request.tsx";

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
    const nearbyDeliverers = deliverers?.filter((deliverer) => {
      if (!deliverer.latitude || !deliverer.longitude) return false;

      const { data: distance } = supabase.rpc("calculate_distance", {
        lat1: order.latitude,
        lon1: order.longitude,
        lat2: deliverer.latitude,
        lon2: deliverer.longitude,
      });

      const maxDistance = deliverer.operating_radius_km || 7;
      return distance && distance <= maxDistance;
    }) || [];

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

      const html = await renderAsync(
        React.createElement(DeliveryRequestEmail, {
          delivererName: deliverer.name,
          orderDate: new Date(order.delivery_date).toLocaleDateString("it-IT"),
          timeSlot: order.time_slot,
          deliveryAddress: order.delivery_address,
          storeName: order.store_name,
          acceptUrl,
          rejectUrl,
          whatsappUrl,
        })
      );

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
