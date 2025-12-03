import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = "davide.tuzi@gmail.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessName, contactName, email, phone, city, storeCount, message } = await req.json();
    
    // Validate required fields
    if (!businessName || !contactName || !email || !phone || !city) {
      return new Response(
        JSON.stringify({ error: 'Tutti i campi obbligatori devono essere compilati' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (businessName.length > 100 || contactName.length > 100 || email.length > 100 || 
        phone.length > 20 || city.length > 100 || (message && message.length > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Input supera la lunghezza massima consentita' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato email non valido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PARTNERSHIP] Nuova richiesta partnership ricevuta:', {
      businessName,
      contactName,
      email,
      phone,
      city,
      storeCount: storeCount || 'N/A'
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create admin notification
    const notificationData = {
      type: 'supermarket_partnership',
      title: `Nuova richiesta partnership: ${businessName}`,
      message: `${contactName} di ${businessName} (${city}) vuole diventare partner. Contatto: ${email} / ${phone}`,
      status: 'pending',
      data: {
        businessName,
        contactName,
        email,
        phone,
        city,
        storeCount: storeCount || null,
        message: message || null,
        receivedAt: new Date().toISOString()
      }
    };

    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .insert(notificationData);

    if (notificationError) {
      console.error('[PARTNERSHIP] Errore creazione notifica admin:', notificationError);
    } else {
      console.log('[PARTNERSHIP] Notifica admin creata con successo');
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const emailContent = `
        <h2>Nuova Richiesta Partnership Supermercato</h2>
        
        <h3>Dettagli Azienda</h3>
        <ul>
          <li><strong>Nome Attività:</strong> ${businessName}</li>
          <li><strong>Città/Zone:</strong> ${city}</li>
          <li><strong>Numero Punti Vendita:</strong> ${storeCount || 'Non specificato'}</li>
        </ul>
        
        <h3>Contatto</h3>
        <ul>
          <li><strong>Nome Referente:</strong> ${contactName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Telefono:</strong> ${phone}</li>
        </ul>
        
        ${message ? `
        <h3>Messaggio</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ` : ''}
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Questa richiesta è stata inviata tramite il form Partnership Supermercati su ALFREDO.
        </p>
      `;

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ALFREDO <noreply@alfredo.delivery>',
            to: [ADMIN_EMAIL],
            subject: `[Partnership] Nuova richiesta da ${businessName}`,
            html: emailContent,
            reply_to: email
          }),
        });

        if (emailResponse.ok) {
          console.log('[PARTNERSHIP] Email inviata con successo a', ADMIN_EMAIL);
        } else {
          const emailError = await emailResponse.text();
          console.error('[PARTNERSHIP] Errore invio email:', emailError);
        }
      } catch (emailErr) {
        console.error('[PARTNERSHIP] Errore invio email:', emailErr);
      }
    } else {
      console.log('[PARTNERSHIP] RESEND_API_KEY non configurata, email non inviata');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Richiesta partnership ricevuta con successo'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PARTNERSHIP] Errore:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
