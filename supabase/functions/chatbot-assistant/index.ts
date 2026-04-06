import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    
    console.log('Chatbot request:', { message, historyLength: conversationHistory.length });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const systemPrompt = `Sei un assistente virtuale per un servizio di consegna spesa a domicilio italiano. 
Rispondi sempre in italiano in modo cordiale e professionale.

Informazioni sul servizio:
- Nome servizio: Consegna Spesa Rapida
- Spesa minima: €25
- Costi di consegna: 
  * Zona 1 (0-7km): €10 per spese <€50, €8 per spese ≥€50
  * Zona 2 (7-10km): €15 per spese <€50, €12 per spese ≥€50
  * Zona 3 (>10km): €20
- Supplementi: €3 per ogni busta oltre le 3, €10 fisso per ordini solo acqua
- Fasce orarie: 9:00-11:00, 11:00-13:00, 15:00-17:00, 17:00-19:00
- Metodi di pagamento: Satispay, PayPal, Carta di credito/debito, Buoni pasto (dove accettati)
- Registrazione: Email, phone, o Google
- Funzionalità: Ricerca prezzi, confronto supermercati, tracking ordini in tempo reale

Puoi aiutare con:
- Informazioni su come funziona il servizio
- Spiegare costi e zone di consegna
- Guidare nella creazione di un ordine
- Rispondere a domande sui pagamenti
- Informazioni su tracking e consegna
- Problemi tecnici generali

Rispondi in modo conciso (max 3-4 frasi) e se non sai qualcosa, sii onesto e suggerisci di contattare il supporto.`;

    // Build conversation contents for Google AI
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    // Add conversation history
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    
    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Troppi messaggi. Attendi un momento e riprova.',
            rateLimited: true 
          }), 
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      const errorText = await response.text();
      console.error('Google AI error:', response.status, errorText);
      throw new Error('AI API error');
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Mi dispiace, non ho capito. Puoi riformulare?';

    console.log('Chatbot response:', reply);

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in chatbot-assistant:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore interno del server',
        reply: 'Mi dispiace, si è verificato un errore. Riprova tra poco.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
