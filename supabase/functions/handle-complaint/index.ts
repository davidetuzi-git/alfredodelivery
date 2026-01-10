import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { complaintId, orderId, description, itemsAffected, imageUrls, userName, userEmail, orderCode } = await req.json();

    console.log("Handle complaint:", { complaintId, orderId, userName });

    if (!complaintId || !orderId || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://preview--alfredo-spesa-per-te.lovable.app";

    const orderDetailUrl = `${appBaseUrl}/order-tracking/${orderId}`;
    const adminDashboardUrl = `${appBaseUrl}/admin`;

    // Build notification messages
    const itemsList = itemsAffected && itemsAffected.length > 0 
      ? itemsAffected.map((item: string) => `• ${item}`).join("\n")
      : "Non specificati";

    const hasImages = imageUrls && imageUrls.length > 0;

    // ============ TELEGRAM NOTIFICATION ============
    if (telegramBotToken) {
      // First, get admin telegram chat ID if exists
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Try to find admin users with telegram
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        for (const adminRole of adminRoles) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("telegram_chat_id")
            .eq("id", adminRole.user_id)
            .single();

          if (adminProfile?.telegram_chat_id) {
            const telegramMessage = `🚨 *RECLAMO URGENTE* 🚨\n\n` +
              `📦 *Ordine:* ${orderCode || orderId.substring(0, 8)}\n` +
              `👤 *Cliente:* ${userName || "Cliente"}\n` +
              `📧 *Email:* ${userEmail || "N/A"}\n\n` +
              `📝 *Descrizione:*\n_${description}_\n\n` +
              `🛒 *Articoli coinvolti:*\n${itemsList}\n\n` +
              `📸 *Foto allegate:* ${hasImages ? "Sì (" + imageUrls.length + ")" : "No"}\n\n` +
              `👉 [Vai alla Dashboard Admin](${adminDashboardUrl})\n` +
              `👉 [Vedi Ordine](${orderDetailUrl})`;

            const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
            await fetch(telegramUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: adminProfile.telegram_chat_id,
                text: telegramMessage,
                parse_mode: "Markdown",
                disable_web_page_preview: true,
              }),
            });
            console.log("Telegram notification sent to admin:", adminRole.user_id);
          }
        }
      }
    }

    // ============ EMAIL NOTIFICATION ============
    if (resendApiKey && adminEmail) {
      const resend = new Resend(resendApiKey);

      const itemsHtml = itemsAffected && itemsAffected.length > 0
        ? `<ul>${itemsAffected.map((item: string) => `<li>${item}</li>`).join("")}</ul>`
        : "<p>Non specificati</p>";

      const imagesHtml = hasImages
        ? `<p><strong>📸 ${imageUrls.length} foto allegate</strong> - Visualizzale nella dashboard admin</p>`
        : "<p>Nessuna foto allegata</p>";

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🚨 RECLAMO URGENTE</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">Dettagli Reclamo</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Ordine:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${orderCode || orderId.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Cliente:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${userName || "Cliente"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${userEmail || "N/A"}</td>
              </tr>
            </table>

            <h3 style="color: #1f2937; margin-top: 20px;">Descrizione del problema:</h3>
            <p style="background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
              ${description}
            </p>

            <h3 style="color: #1f2937;">Articoli coinvolti:</h3>
            ${itemsHtml}

            ${imagesHtml}

            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminDashboardUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
                Vai alla Dashboard
              </a>
              <a href="${orderDetailUrl}" style="display: inline-block; background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Vedi Ordine
              </a>
            </div>
          </div>

          <div style="padding: 15px; background-color: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
            <p>Questo reclamo richiede attenzione entro 24 ore.</p>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: "Alfredo <noreply@resend.dev>",
          to: [adminEmail],
          subject: `🚨 RECLAMO URGENTE - Ordine ${orderCode || orderId.substring(0, 8)}`,
          html: emailHtml,
        });
        console.log("Email notification sent to admin:", adminEmail);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    // ============ USER NOTIFICATION ============
    if (resendApiKey && userEmail) {
      const resend = new Resend(resendApiKey);

      const userEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Reclamo Ricevuto</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <p>Ciao ${userName || ""},</p>
            
            <p>Abbiamo ricevuto il tuo reclamo relativo all'ordine <strong>${orderCode || orderId.substring(0, 8)}</strong>.</p>
            
            <p>Il nostro team esaminerà la tua segnalazione e ti contatterà il prima possibile.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Riepilogo segnalazione:</h3>
              <p><strong>Descrizione:</strong> ${description}</p>
              ${hasImages ? `<p><strong>Foto allegate:</strong> ${imageUrls.length}</p>` : ""}
            </div>

            <p>Grazie per la pazienza.</p>
            <p>Il team di Alfredo</p>
          </div>

          <div style="padding: 15px; background-color: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
            <p>Alfredo - La spesa a domicilio</p>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: "Alfredo <noreply@resend.dev>",
          to: [userEmail],
          subject: `Reclamo ricevuto - Ordine ${orderCode || orderId.substring(0, 8)}`,
          html: userEmailHtml,
        });
        console.log("Confirmation email sent to user:", userEmail);
      } catch (emailError) {
        console.error("Error sending user confirmation email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in handle-complaint:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
