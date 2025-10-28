const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminEmail } = await req.json();
    
    if (!adminEmail) {
      throw new Error('Email amministratore mancante');
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'ALFREDO Admin <onboarding@resend.dev>',
        to: ['davide.tuzi@gmail.com'],
        subject: 'Richiesta recupero password Admin ALFREDO',
        html: `
          <h1>Richiesta Recupero Password</h1>
          <p>È stata ricevuta una richiesta di recupero password per l'account amministratore ALFREDO.</p>
          <p><strong>Email richiedente:</strong> ${adminEmail}</p>
          <p><strong>Data richiesta:</strong> ${new Date().toLocaleString('it-IT')}</p>
          <hr />
          <p>Credenziali attuali:</p>
          <ul>
            <li><strong>Email:</strong> alfredo@admin.com</li>
            <li><strong>Password:</strong> ALFREDO</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Se non hai richiesto questo recupero, ignora questa email.
          </p>
        `,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Errore invio email:', data);
      throw new Error(data.message || 'Errore invio email');
    }

    console.log('Email recupero password inviata con successo:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email di recupero inviata con successo'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Errore recupero password:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
