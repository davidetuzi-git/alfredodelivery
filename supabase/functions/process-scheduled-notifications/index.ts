import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledNotification {
  id: string;
  order_id: string;
  recipient_type: 'customer' | 'deliverer';
  recipient_id: string;
  notification_type: '24h_before' | '2h_before' | '1h_before' | 'shopping_started';
  scheduled_for: string;
  channels: string[];
}

const sendTelegramMessage = async (chatId: string, message: string) => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Alfredo Delivery <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Error sending email:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const formatTimeSlot = (timeSlot: string) => {
  return timeSlot || "Non specificato";
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing scheduled notifications...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all pending notifications that should be sent now
    const now = new Date().toISOString();
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .is("sent_at", null)
      .lte("scheduled_for", now);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingNotifications?.length || 0} pending notifications`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
    };

    for (const notification of pendingNotifications || []) {
      results.processed++;

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", notification.order_id)
        .single();

      if (orderError || !order) {
        console.error(`Order not found for notification ${notification.id}`);
        // Mark as sent to avoid retrying
        await supabase
          .from("scheduled_notifications")
          .update({ sent_at: now })
          .eq("id", notification.id);
        results.failed++;
        continue;
      }

      // Skip if order is cancelled or already delivered
      if (order.status === "cancelled" || order.delivery_status === "delivered") {
        console.log(`Skipping notification for cancelled/delivered order ${order.id}`);
        await supabase
          .from("scheduled_notifications")
          .update({ sent_at: now })
          .eq("id", notification.id);
        continue;
      }

      const channels = notification.channels || ["email"];
      let emailSent = false;
      let telegramSent = false;

      if (notification.recipient_type === "customer") {
        // Get customer profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", notification.recipient_id)
          .single();

        // Get user email from auth
        const { data: authData } = await supabase.auth.admin.getUserById(notification.recipient_id);
        const userEmail = authData?.user?.email;

        // Build notification messages based on type
        let emailSubject = "";
        let emailHtml = "";
        let telegramMessage = "";

        switch (notification.notification_type) {
          case "24h_before":
            emailSubject = `📅 Promemoria: consegna domani - Ordine ${order.pickup_code}`;
            emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #f97316;">📅 Consegna domani!</h1>
                <p>Ciao ${profile?.first_name || "Cliente"},</p>
                <p>Ti ricordiamo che domani riceverai la tua consegna:</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>🔑 Codice ritiro:</strong> ${order.pickup_code}</p>
                  <p><strong>📅 Data:</strong> ${formatDate(order.delivery_date)}</p>
                  <p><strong>🕐 Fascia oraria:</strong> ${formatTimeSlot(order.time_slot)}</p>
                  <p><strong>📍 Indirizzo:</strong> ${order.delivery_address}</p>
                </div>
                <p>Assicurati di essere disponibile nella fascia oraria indicata!</p>
                <p>Grazie per aver scelto Alfredo Delivery 🧡</p>
              </div>
            `;
            telegramMessage = `📅 *Promemoria consegna domani!*\n\n🔑 Codice: \`${order.pickup_code}\`\n📅 ${formatDate(order.delivery_date)}\n🕐 ${formatTimeSlot(order.time_slot)}\n📍 ${order.delivery_address}\n\nAssicurati di essere disponibile! 🧡`;
            break;

          case "1h_before":
            emailSubject = `⏰ Consegna tra poco! - Ordine ${order.pickup_code}`;
            emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #f97316;">⏰ Consegna in arrivo!</h1>
                <p>Ciao ${profile?.first_name || "Cliente"},</p>
                <p>La tua consegna arriverà entro un'ora!</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>🔑 Codice ritiro:</strong> ${order.pickup_code}</p>
                  <p><strong>🕐 Fascia oraria:</strong> ${formatTimeSlot(order.time_slot)}</p>
                  <p><strong>📍 Indirizzo:</strong> ${order.delivery_address}</p>
                  ${order.deliverer_name ? `<p><strong>🚚 Fattorino:</strong> ${order.deliverer_name}</p>` : ""}
                </div>
                <p>Preparati a ricevere la tua spesa! 🛒</p>
              </div>
            `;
            telegramMessage = `⏰ *Consegna in arrivo!*\n\nLa tua consegna arriverà entro un'ora!\n\n🔑 Codice: \`${order.pickup_code}\`\n🕐 ${formatTimeSlot(order.time_slot)}\n📍 ${order.delivery_address}${order.deliverer_name ? `\n🚚 Fattorino: ${order.deliverer_name}` : ""}\n\nPreparati a ricevere la tua spesa! 🛒`;
            break;

          case "shopping_started":
            emailSubject = `🛒 Il fattorino sta facendo la spesa - Ordine ${order.pickup_code}`;
            emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #f97316;">🛒 Spesa in corso!</h1>
                <p>Ciao ${profile?.first_name || "Cliente"},</p>
                <p>${order.deliverer_name || "Il fattorino"} sta facendo la spesa per te!</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>🔑 Codice ritiro:</strong> ${order.pickup_code}</p>
                  <p><strong>🏪 Supermercato:</strong> ${order.store_name}</p>
                  <p><strong>📍 Consegna:</strong> ${order.delivery_address}</p>
                </div>
                <p>Riceverai un'altra notifica quando il fattorino sarà in viaggio! 🚚</p>
              </div>
            `;
            telegramMessage = `🛒 *Spesa in corso!*\n\n${order.deliverer_name || "Il fattorino"} sta facendo la spesa per te!\n\n🔑 Codice: \`${order.pickup_code}\`\n🏪 ${order.store_name}\n📍 ${order.delivery_address}\n\nRiceverai un'altra notifica quando sarà in viaggio! 🚚`;
            break;
        }

        // Send email
        if (channels.includes("email") && userEmail) {
          emailSent = await sendEmail(userEmail, emailSubject, emailHtml);
        }

        // Send Telegram
        if (channels.includes("telegram") && profile?.telegram_chat_id) {
          telegramSent = await sendTelegramMessage(profile.telegram_chat_id, telegramMessage);
        }

      } else if (notification.recipient_type === "deliverer") {
        // Get deliverer info
        const { data: deliverer } = await supabase
          .from("deliverers")
          .select("*")
          .eq("id", notification.recipient_id)
          .single();

        if (!deliverer) {
          console.error(`Deliverer not found for notification ${notification.id}`);
          await supabase
            .from("scheduled_notifications")
            .update({ sent_at: now })
            .eq("id", notification.id);
          results.failed++;
          continue;
        }

        let telegramMessage = "";

        switch (notification.notification_type) {
          case "24h_before":
            telegramMessage = `📅 *Promemoria: consegna domani!*\n\nCiao ${deliverer.name}!\n\nHai una consegna programmata per domani:\n\n🔑 Codice: \`${order.pickup_code}\`\n📅 ${formatDate(order.delivery_date)}\n🕐 ${formatTimeSlot(order.time_slot)}\n🏪 ${order.store_name}\n📍 ${order.delivery_address}\n\nAssicurati di essere disponibile! 💪`;
            break;

          case "2h_before":
            telegramMessage = `⏰ *Consegna tra 2 ore!*\n\nCiao ${deliverer.name}!\n\nTi ricordiamo la consegna programmata:\n\n🔑 Codice: \`${order.pickup_code}\`\n🕐 ${formatTimeSlot(order.time_slot)}\n🏪 ${order.store_name}\n📍 ${order.delivery_address}\n\nPreparati a partire! 🚚`;
            break;
        }

        // Send Telegram to deliverer
        if (deliverer.telegram_chat_id && telegramMessage) {
          telegramSent = await sendTelegramMessage(deliverer.telegram_chat_id, telegramMessage);
        }

        // Send email to deliverer if available
        if (channels.includes("email") && deliverer.email) {
          const emailSubject = notification.notification_type === "24h_before"
            ? `📅 Promemoria: consegna domani - ${order.pickup_code}`
            : `⏰ Consegna tra 2 ore - ${order.pickup_code}`;
          
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #f97316;">${notification.notification_type === "24h_before" ? "📅 Consegna domani!" : "⏰ Consegna tra 2 ore!"}</h1>
              <p>Ciao ${deliverer.name},</p>
              <p>${notification.notification_type === "24h_before" ? "Ti ricordiamo che hai una consegna programmata per domani:" : "Ti ricordiamo la consegna programmata:"}</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>🔑 Codice ritiro:</strong> ${order.pickup_code}</p>
                <p><strong>📅 Data:</strong> ${formatDate(order.delivery_date)}</p>
                <p><strong>🕐 Fascia oraria:</strong> ${formatTimeSlot(order.time_slot)}</p>
                <p><strong>🏪 Supermercato:</strong> ${order.store_name}</p>
                <p><strong>📍 Consegna:</strong> ${order.delivery_address}</p>
              </div>
              <p>Buon lavoro! 💪</p>
            </div>
          `;
          emailSent = await sendEmail(deliverer.email, emailSubject, emailHtml);
        }
      }

      // Mark notification as sent
      await supabase
        .from("scheduled_notifications")
        .update({ sent_at: now })
        .eq("id", notification.id);

      if (emailSent || telegramSent) {
        results.sent++;
        console.log(`Notification ${notification.id} sent successfully`);
      } else {
        results.failed++;
        console.log(`Notification ${notification.id} failed to send (no valid channels)`);
      }
    }

    console.log(`Processing complete: ${results.processed} processed, ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing scheduled notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
