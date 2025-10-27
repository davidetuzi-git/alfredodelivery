import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, storeName } = await req.json();
    
    if (!product || !storeName) {
      return new Response(
        JSON.stringify({ error: 'Product and store name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching price for product: ${product} at ${storeName}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Sei un assistente esperto di prezzi dei supermercati in Italia. Se il prodotto è descritto in modo generico (senza marca, formato o quantità specifica), suggerisci cosa specificare iniziando con "SPECIFICA:" seguito dal suggerimento. Altrimenti, fornisci SOLO il prezzo medio in euro come numero decimale (es: 2.50).'
          },
          {
            role: 'user',
            content: `Prodotto: "${product}" al supermercato ${storeName}. Se mancano dettagli (marca, formato, peso), rispondi "SPECIFICA: [suggerimento]". Altrimenti rispondi solo con il prezzo in euro.`
          }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const priceText = data.choices?.[0]?.message?.content || '0';
    
    // Check if AI is asking for more details
    if (priceText.startsWith('SPECIFICA:')) {
      const suggestion = priceText.replace('SPECIFICA:', '').trim();
      console.log('Suggestion requested:', suggestion);
      return new Response(
        JSON.stringify({ suggestion, needsDetails: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the price from the response
    const priceMatch = priceText.match(/\d+[.,]?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

    console.log('Price search successful:', price);

    return new Response(
      JSON.stringify({ price, priceInfo: `€${price.toFixed(2)}`, needsDetails: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-product-price function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
