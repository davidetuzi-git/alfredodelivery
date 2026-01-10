import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditWithUser {
  id: string;
  user_id: string;
  amount: number;
  expires_at: string;
  user_email: string;
  user_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find credits expiring in ~30 days that haven't had a reminder sent
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const thirtyOneDaysFromNow = new Date();
    thirtyOneDaysFromNow.setDate(thirtyOneDaysFromNow.getDate() + 31);

    console.log('Looking for credits expiring between', thirtyDaysFromNow.toISOString(), 'and', thirtyOneDaysFromNow.toISOString());

    // Get credits expiring in approximately 30 days
    const { data: expiringCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('id, user_id, amount, expires_at')
      .is('used_at', null)
      .is('reminder_sent_at', null)
      .gte('expires_at', thirtyDaysFromNow.toISOString())
      .lt('expires_at', thirtyOneDaysFromNow.toISOString());

    if (creditsError) {
      console.error('Error fetching expiring credits:', creditsError);
      throw creditsError;
    }

    console.log('Found', expiringCredits?.length || 0, 'credits to remind about');

    if (!expiringCredits || expiringCredits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No credits expiring soon', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group credits by user
    const creditsByUser = new Map<string, typeof expiringCredits>();
    for (const credit of expiringCredits) {
      const existing = creditsByUser.get(credit.user_id) || [];
      existing.push(credit);
      creditsByUser.set(credit.user_id, existing);
    }

    let emailsSent = 0;
    let creditsUpdated = 0;

    for (const [userId, userCredits] of creditsByUser) {
      // Get user info
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      
      if (!userData?.user?.email) {
        console.log('No email for user', userId);
        continue;
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name')
        .eq('id', userId)
        .single();

      const userName = profile?.full_name || profile?.first_name || 'Cliente';
      const userEmail = userData.user.email;

      // Calculate total expiring amount
      const totalExpiring = userCredits.reduce((sum, c) => sum + Number(c.amount), 0);
      const earliestExpiry = userCredits
        .map(c => new Date(c.expires_at))
        .sort((a, b) => a.getTime() - b.getTime())[0];

      const expiryFormatted = earliestExpiry.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Send email if RESEND_API_KEY is configured
      if (resendApiKey) {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .amount { font-size: 36px; font-weight: bold; color: #22c55e; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎁 Hai crediti in scadenza!</h1>
    </div>
    <div class="content">
      <p>Ciao <strong>${userName}</strong>,</p>
      
      <p>Ti ricordiamo che hai dei crediti spesa ALFREDO che stanno per scadere:</p>
      
      <p style="text-align: center;">
        <span class="amount">€${totalExpiring.toFixed(2)}</span>
        <br>
        <small>in scadenza il ${expiryFormatted}</small>
      </p>
      
      <div class="warning">
        <strong>⚠️ Attenzione:</strong> I crediti non utilizzati entro la data di scadenza andranno persi.
      </div>
      
      <p>Questi crediti ti sono stati assegnati per compensare eventuali discrepanze di prezzo nei tuoi ordini precedenti. Usali per la tua prossima spesa!</p>
      
      <p style="text-align: center;">
        <a href="https://alfredo.app/ordina" class="cta">Ordina ora e usa i tuoi crediti</a>
      </p>
      
      <p>Grazie per essere un cliente ALFREDO! 🛒</p>
    </div>
    <div class="footer">
      <p>ALFREDO - La tua spesa, consegnata</p>
      <p>Hai ricevuto questa email perché hai crediti in scadenza. Non sei più interessato? Contattaci per assistenza.</p>
    </div>
  </div>
</body>
</html>
        `;

        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'ALFREDO <noreply@alfredo.app>',
              to: userEmail,
              subject: `⏰ Hai €${totalExpiring.toFixed(2)} in crediti che scadono tra 30 giorni!`,
              html: emailHtml,
            }),
          });

          if (emailRes.ok) {
            console.log('Email sent to', userEmail);
            emailsSent++;
          } else {
            const errorText = await emailRes.text();
            console.error('Failed to send email:', errorText);
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      // Mark credits as reminded
      const creditIds = userCredits.map(c => c.id);
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', creditIds);

      if (updateError) {
        console.error('Error updating reminder status:', updateError);
      } else {
        creditsUpdated += creditIds.length;
      }
    }

    console.log(`Processed: ${emailsSent} emails sent, ${creditsUpdated} credits marked`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        creditsUpdated,
        usersProcessed: creditsByUser.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-credit-expiry-reminders:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
