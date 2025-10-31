import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This edge function checks if a deliverer is available for a specific date and time slot.
 * It returns whether the deliverer is busy during that specific slot.
 */

interface CheckAvailabilityRequest {
  deliverer_id: string;
  delivery_date: string;
  time_slot: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deliverer_id, delivery_date, time_slot }: CheckAvailabilityRequest = await req.json();
    
    if (!deliverer_id || !delivery_date || !time_slot) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract date from delivery_date (YYYY-MM-DD)
    const orderDate = new Date(delivery_date).toISOString().split('T')[0];

    // Check if deliverer has orders in the same date and time slot
    const { data: conflictingOrders, error } = await supabase
      .from("orders")
      .select("id")
      .eq("deliverer_id", deliverer_id)
      .gte("delivery_date", orderDate + "T00:00:00Z")
      .lte("delivery_date", orderDate + "T23:59:59Z")
      .eq("time_slot", time_slot)
      .in("delivery_status", ["confirmed", "assigned", "at_store", "shopping_complete", "on_the_way"]);

    if (error) {
      throw error;
    }

    const isBusy = conflictingOrders && conflictingOrders.length > 0;

    return new Response(
      JSON.stringify({ 
        is_busy: isBusy,
        conflicting_orders: conflictingOrders?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error checking availability:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
