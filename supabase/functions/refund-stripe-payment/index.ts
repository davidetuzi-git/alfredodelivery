import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[REFUND] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS for admin verification
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    
    if (!userData.user) {
      throw new Error("Non autenticato");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error("Accesso non autorizzato - solo admin");
    }

    logStep("Admin verified", { userId: userData.user.id });

    const { orderId, amount, reason } = await req.json();
    
    if (!orderId) {
      throw new Error("ID ordine mancante");
    }

    logStep("Refund request received", { orderId, amount, reason });

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Ordine non trovato");
    }

    if (order.payment_method !== 'card') {
      throw new Error("Rimborso disponibile solo per pagamenti con carta");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Search for the payment intent related to this order
    // We'll search by metadata or by amount and date
    const payments = await stripe.paymentIntents.list({
      limit: 50,
    });

    // Find the payment for this order (by matching amount and approximate time)
    const orderTotal = Math.round(order.total_amount * 100);
    const orderDate = new Date(order.created_at);
    
    let paymentIntent = payments.data.find((pi: any) => {
      const piDate = new Date(pi.created * 1000);
      const timeDiff = Math.abs(piDate.getTime() - orderDate.getTime());
      // Match by amount and within 1 hour of order creation
      return pi.amount === orderTotal && 
             timeDiff < 3600000 && 
             pi.status === 'succeeded';
    });

    if (!paymentIntent) {
      // Try to find by metadata if available
      paymentIntent = payments.data.find((pi: any) => 
        pi.metadata?.user_id === order.user_id && 
        pi.status === 'succeeded'
      );
    }

    if (!paymentIntent) {
      throw new Error("Pagamento Stripe non trovato per questo ordine");
    }

    logStep("Payment intent found", { paymentIntentId: paymentIntent.id });

    // Calculate refund amount
    const refundAmountCents = amount 
      ? Math.round(amount * 100) 
      : paymentIntent.amount; // Full refund if no amount specified

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: refundAmountCents,
      reason: reason === 'duplicate' ? 'duplicate' : 
              reason === 'fraudulent' ? 'fraudulent' : 
              'requested_by_customer',
    });

    logStep("Refund created", { refundId: refund.id, amount: refundAmountCents });

    // Update order status if fully refunded
    const isFullRefund = refundAmountCents >= paymentIntent.amount;
    
    if (isFullRefund) {
      await supabaseClient
        .from('orders')
        .update({ 
          status: 'cancelled',
          delivery_status: 'cancelled'
        })
        .eq('id', orderId);
    }

    // Create notification for user
    await supabaseClient.from('user_notifications').insert({
      user_id: order.user_id,
      type: 'refund',
      title: 'Rimborso effettuato',
      message: isFullRefund 
        ? `Il tuo ordine è stato completamente rimborsato (€${(refundAmountCents / 100).toFixed(2)})`
        : `Hai ricevuto un rimborso parziale di €${(refundAmountCents / 100).toFixed(2)}`,
      data: { 
        order_id: orderId, 
        refund_amount: refundAmountCents / 100,
        refund_id: refund.id 
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      refundId: refund.id,
      amount: refundAmountCents / 100,
      isFullRefund
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("Error", { message: error?.message });
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
