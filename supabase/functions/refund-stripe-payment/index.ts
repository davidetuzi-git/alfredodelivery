import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    const { orderId, amount, reason, refundPassword } = await req.json();
    
    // Verify dedicated refund password
    const expectedPassword = Deno.env.get("REFUND_PASSWORD");
    if (!expectedPassword) {
      throw new Error("Password rimborso non configurata nel sistema");
    }
    
    if (!refundPassword || refundPassword !== expectedPassword) {
      logStep("Invalid refund password attempt", { userId: userData.user.id });
      throw new Error("Password rimborso non valida");
    }

    logStep("Refund password verified");

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
    // Get more payments and search with broader criteria
    const payments = await stripe.paymentIntents.list({
      limit: 100,
    });

    logStep("Searching payment intents", { count: payments.data.length });

    // Find the payment for this order using multiple strategies
    const orderTotal = Math.round(order.total_amount * 100);
    const orderDate = new Date(order.created_at);
    
    let paymentIntent = null;

    // Strategy 1: Match by amount and time (within 24 hours)
    paymentIntent = payments.data.find((pi: any) => {
      const piDate = new Date(pi.created * 1000);
      const timeDiff = Math.abs(piDate.getTime() - orderDate.getTime());
      // Match by amount and within 24 hours of order creation
      return pi.amount === orderTotal && 
             timeDiff < 86400000 && 
             pi.status === 'succeeded';
    });

    logStep("Strategy 1 (amount+time)", { found: !!paymentIntent });

    // Strategy 2: Match by metadata user_id
    if (!paymentIntent) {
      paymentIntent = payments.data.find((pi: any) => 
        pi.metadata?.user_id === order.user_id && 
        pi.status === 'succeeded' &&
        pi.amount === orderTotal
      );
      logStep("Strategy 2 (metadata user_id)", { found: !!paymentIntent });
    }

    // Strategy 3: Match by customer email
    if (!paymentIntent) {
      // Get user email
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', order.user_id)
        .single();

      if (profile) {
        // Search in Stripe customers
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(order.user_id);
        const userEmail = authUser?.user?.email;
        
        if (userEmail) {
          const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
          if (customers.data.length > 0) {
            const customerId = customers.data[0].id;
            // Find payment by customer and amount
            paymentIntent = payments.data.find((pi: any) => 
              pi.customer === customerId && 
              pi.amount === orderTotal &&
              pi.status === 'succeeded'
            );
            logStep("Strategy 3 (customer email)", { found: !!paymentIntent, email: userEmail });
          }
        }
      }
    }

    // Strategy 4: Match just by exact amount and succeeded status (last resort)
    if (!paymentIntent) {
      paymentIntent = payments.data.find((pi: any) => 
        pi.amount === orderTotal && 
        pi.status === 'succeeded'
      );
      logStep("Strategy 4 (amount only)", { found: !!paymentIntent });
    }

    if (!paymentIntent) {
      logStep("No payment found", { orderTotal, orderUserId: order.user_id });
      throw new Error("Pagamento Stripe non trovato per questo ordine. Verifica che l'ordine sia stato pagato con carta.");
    }

    logStep("Payment intent found", { paymentIntentId: paymentIntent.id });

    // Calculate refund amount
    const refundAmountCents = amount 
      ? Math.round(amount * 100) 
      : paymentIntent.amount;

    // Send confirmation email to admin before processing
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!adminEmail || !resendApiKey) {
      throw new Error("Configurazione email admin mancante");
    }

    const resend = new Resend(resendApiKey);
    const refundAmountEuro = (refundAmountCents / 100).toFixed(2);
    const isFullRefund = refundAmountCents >= paymentIntent.amount;

    // Send notification email to admin
    const { error: emailError } = await resend.emails.send({
      from: "Alfredo <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `🔔 Rimborso ${isFullRefund ? 'Totale' : 'Parziale'} Effettuato - Ordine ${order.pickup_code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">⚠️ Notifica Rimborso</h1>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Dettagli Rimborso</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;"><strong>Ordine:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">${order.pickup_code}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;"><strong>Cliente:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">${order.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;"><strong>Tipo:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">${isFullRefund ? 'Rimborso Totale' : 'Rimborso Parziale'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;"><strong>Importo:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 18px; color: #dc2626;"><strong>€${refundAmountEuro}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;"><strong>Motivo:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">${reason === 'duplicate' ? 'Pagamento duplicato' : reason === 'fraudulent' ? 'Fraudolento' : 'Richiesto dal cliente'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Admin:</strong></td>
                <td style="padding: 8px 0;">${userData.user.email}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #6b7280; font-size: 12px;">
            Data/Ora: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}
          </p>
        </div>
      `,
    });

    if (emailError) {
      logStep("Email sending failed", { error: emailError });
      // Continue with refund even if email fails, but log the error
    } else {
      logStep("Confirmation email sent to admin", { adminEmail });
    }

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
        ? `Il tuo ordine è stato completamente rimborsato (€${refundAmountEuro})`
        : `Hai ricevuto un rimborso parziale di €${refundAmountEuro}`,
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
