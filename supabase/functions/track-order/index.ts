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
    const { pickupCode } = await req.json();

    if (!pickupCode) {
      return new Response(
        JSON.stringify({ error: "Pickup code is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order with limited, non-sensitive information
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        pickup_code,
        store_name,
        delivery_status,
        delivery_date,
        time_slot,
        total_amount,
        created_at,
        status_updated_at
      `)
      .eq("pickup_code", pickupCode.toUpperCase())
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Fetch status history
    const { data: statusHistory } = await supabase
      .from("order_status_history")
      .select("status, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    // Return only non-sensitive tracking information
    return new Response(
      JSON.stringify({
        pickupCode: order.pickup_code,
        storeName: order.store_name,
        deliveryStatus: order.delivery_status,
        deliveryDate: order.delivery_date,
        timeSlot: order.time_slot,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        statusUpdatedAt: order.status_updated_at,
        statusHistory: statusHistory || []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error in track-order:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);
