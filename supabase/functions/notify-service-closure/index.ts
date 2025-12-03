import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Alfredo <noreply@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return response.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClosureDate {
  date: string;
  reason: string | null;
}

interface NotificationRequest {
  dates: ClosureDate[];
  sendToUsers: boolean;
  sendToDeliverers: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function generateEmailHtml(dates: ClosureDate[]): string {
  const datesList = dates.map(d => `
    <li style="margin-bottom: 8px;">
      <strong>${formatDate(d.date)}</strong>
      ${d.reason ? `<br><span style="color: #666; font-size: 14px;">${d.reason}</span>` : ''}
    </li>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Comunicazione Importante - Alfredo</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🛒 Alfredo</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">La tua spesa, consegnata</p>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #dc2626; display: flex; align-items: center; gap: 10px;">
          ⚠️ Comunicazione Importante
        </h2>
        
        <p>Gentile Cliente,</p>
        
        <p>Ti informiamo che il servizio di consegna <strong>Alfredo</strong> non sarà disponibile nelle seguenti date:</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            ${datesList}
          </ul>
        </div>
        
        <p>Ti invitiamo a programmare le tue consegne in anticipo per evitare inconvenienti.</p>
        
        <p>Per qualsiasi domanda, non esitare a contattarci.</p>
        
        <p style="margin-top: 30px;">
          Cordiali saluti,<br>
          <strong>Il Team di Alfredo</strong>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>Questa è una comunicazione di servizio automatica.</p>
        <p>© ${new Date().getFullYear()} Alfredo - Tutti i diritti riservati</p>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { dates, sendToUsers, sendToDeliverers }: NotificationRequest = await req.json();

    console.log("Sending service closure notification", { dates, sendToUsers, sendToDeliverers });

    const emailRecipients: string[] = [];

    // Get user emails if needed - checking communication preferences
    if (sendToUsers) {
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (!usersError && users?.users) {
        // Get all user IDs with their emails
        const userMap = new Map(users.users.map(u => [u.id, u.email]));
        
        // Get communication preferences for users who have order_updates enabled
        const { data: prefsData } = await supabase
          .from('communication_preferences')
          .select('user_id')
          .eq('order_updates', true);
        
        const usersWithConsent = new Set(prefsData?.map(p => p.user_id) || []);
        
        // Also include users who don't have preferences set (default is consent)
        const { data: allPrefsData } = await supabase
          .from('communication_preferences')
          .select('user_id');
        
        const usersWithPrefs = new Set(allPrefsData?.map(p => p.user_id) || []);
        
        // Add emails of users who either:
        // 1. Have preferences and order_updates is true
        // 2. Don't have preferences yet (default consent)
        for (const [userId, email] of userMap) {
          if (email) {
            if (usersWithConsent.has(userId) || !usersWithPrefs.has(userId)) {
              emailRecipients.push(email);
            }
          }
        }
        
        console.log(`Users with consent: ${emailRecipients.length} out of ${users.users.length}`);
      }
    }

    // Get deliverer emails if needed
    if (sendToDeliverers) {
      const { data: deliverers, error: deliverersError } = await supabase
        .from('deliverers')
        .select('email')
        .not('email', 'is', null);
      
      if (!deliverersError && deliverers) {
        emailRecipients.push(...deliverers.map(d => d.email).filter(Boolean) as string[]);
      }
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(emailRecipients)];

    if (uniqueRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending to ${uniqueRecipients.length} recipients`);

    const emailHtml = generateEmailHtml(dates);

    // Send emails in batches of 50 to avoid rate limits
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    const subject = "⚠️ Comunicazione Importante - Servizio Non Disponibile";

    for (let i = 0; i < uniqueRecipients.length; i += batchSize) {
      const batch = uniqueRecipients.slice(i, i + batchSize);
      
      const promises = batch.map(email => sendEmail(email, subject, emailHtml));

      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          console.error("Failed to send email:", result.reason);
        }
      });
    }

    console.log(`Emails sent: ${successCount} success, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: errorCount,
        total: uniqueRecipients.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-service-closure:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
