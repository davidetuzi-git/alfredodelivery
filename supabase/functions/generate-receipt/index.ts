import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-RECEIPT] ${step}${detailsStr}`);
};

const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const generateReceiptHTML = (order: any, userEmail: string) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = order.total_amount - order.delivery_fee + order.discount + (order.voucher_discount || 0);
  
  const itemsHTML = items.map((item: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; text-align: left;">${item.name || 'Articolo'}</td>
      <td style="padding: 12px 0; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 12px 0; text-align: right;">${item.price ? formatCurrency(item.price) : '-'}</td>
      <td style="padding: 12px 0; text-align: right;">${item.price ? formatCurrency((item.price || 0) * (item.quantity || 1)) : '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ricevuta Ordine ${order.pickup_code}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
    }
  </style>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">🛒 Alfredo Delivery</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">La tua spesa, consegnata a casa</p>
    </div>

    <!-- Receipt Title -->
    <div style="padding: 30px 30px 20px 30px; text-align: center; border-bottom: 2px dashed #e5e7eb;">
      <h2 style="margin: 0; color: #22c55e; font-size: 22px;">RICEVUTA DI PAGAMENTO</h2>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Ordine confermato</p>
    </div>

    <!-- Order Info -->
    <div style="padding: 25px 30px; background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Codice Ordine:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #16a34a; font-family: monospace;">${order.pickup_code}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Data Ordine:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${formatDate(order.created_at)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Data Consegna:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${new Date(order.delivery_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })} - ${order.time_slot}</td>
        </tr>
      </table>
    </div>

    <!-- Customer Info -->
    <div style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">📍 Dettagli Consegna</h3>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Cliente:</strong> ${order.customer_name}</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Telefono:</strong> ${order.customer_phone}</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Indirizzo:</strong> ${order.delivery_address}</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Supermercato:</strong> ${order.store_name}</p>
    </div>

    <!-- Items -->
    <div style="padding: 25px 30px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">🛍️ Articoli Ordinati</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 12px 0; text-align: left; color: #6b7280; font-weight: 600;">Prodotto</th>
            <th style="padding: 12px 0; text-align: center; color: #6b7280; font-weight: 600;">Qtà</th>
            <th style="padding: 12px 0; text-align: right; color: #6b7280; font-weight: 600;">Prezzo</th>
            <th style="padding: 12px 0; text-align: right; color: #6b7280; font-weight: 600;">Totale</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML || '<tr><td colspan="4" style="padding: 12px 0; text-align: center; color: #6b7280;">Lista spesa allegata all\'ordine</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding: 25px 30px; background-color: #f9fafb;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Subtotale articoli:</td>
          <td style="padding: 8px 0; text-align: right;">${formatCurrency(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Costo consegna:</td>
          <td style="padding: 8px 0; text-align: right;">${formatCurrency(order.delivery_fee || 0)}</td>
        </tr>
        ${order.discount > 0 ? `
        <tr>
          <td style="padding: 8px 0; color: #16a34a;">Sconto fedeltà:</td>
          <td style="padding: 8px 0; text-align: right; color: #16a34a;">-${formatCurrency(order.discount)}</td>
        </tr>
        ` : ''}
        ${order.voucher_discount > 0 ? `
        <tr>
          <td style="padding: 8px 0; color: #16a34a;">Sconto voucher${order.voucher_code ? ` (${order.voucher_code})` : ''}:</td>
          <td style="padding: 8px 0; text-align: right; color: #16a34a;">-${formatCurrency(order.voucher_discount)}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 15px 0 8px 0; font-size: 18px; font-weight: bold;">TOTALE PAGATO:</td>
          <td style="padding: 15px 0 8px 0; text-align: right; font-size: 24px; font-weight: bold; color: #16a34a;">${formatCurrency(order.total_amount)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Metodo di pagamento:</td>
          <td style="padding: 4px 0; text-align: right; color: #6b7280; font-size: 12px;">${order.payment_method === 'card' ? '💳 Carta di credito' : order.payment_method === 'paypal' ? '💰 PayPal' : '💵 Contanti'}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding: 25px 30px; text-align: center; background-color: #f0fdf4; border-top: 2px dashed #e5e7eb;">
      <p style="margin: 0 0 10px 0; color: #16a34a; font-weight: bold; font-size: 16px;">✅ Pagamento confermato</p>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">Grazie per aver scelto Alfredo Delivery!</p>
      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">Per assistenza: support@alfredodelivery.it</p>
    </div>
  </div>

  <!-- Legal Footer -->
  <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 11px;">
    <p style="margin: 5px 0;">Questa ricevuta è stata generata automaticamente e non necessita di firma.</p>
    <p style="margin: 5px 0;">Documento generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { orderId, sendEmail } = await req.json();
    logStep("Request parsed", { orderId, sendEmail });

    if (!orderId) {
      throw new Error("orderId is required");
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }
    logStep("Order fetched", { pickupCode: order.pickup_code });

    // Get user email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(order.user_id);
    if (userError || !userData?.user?.email) {
      throw new Error("User email not found");
    }
    const userEmail = userData.user.email;
    logStep("User email found", { email: userEmail });

    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(order, userEmail);
    logStep("Receipt HTML generated");

    // Send email if requested
    if (sendEmail) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }

      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "Alfredo Delivery <onboarding@resend.dev>",
        to: [userEmail],
        subject: `🧾 Ricevuta Ordine ${order.pickup_code} - Alfredo Delivery`,
        html: receiptHTML,
      });

      if (emailError) {
        logStep("Email send error", { error: emailError });
        throw new Error(`Failed to send email: ${emailError.message}`);
      }
      logStep("Email sent successfully");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        receiptHTML,
        message: sendEmail ? "Receipt sent via email" : "Receipt generated"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
