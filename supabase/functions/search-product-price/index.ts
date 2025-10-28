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

    // Estrae solo il nome della catena (prima del trattino)
    const chainName = storeName.split(' - ')[0].trim();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching price for product: ${product} at ${chainName}`);

    // Complete product description with AI if details are missing
    let finalProductDescription = product;
    let wasCompleted = false;
    
    const sizePatterns = [
      /\d+\s*(ml|l|litri|litro)/i,
      /\d+\s*(g|kg|grammi|chili)/i,
      /\d+\s*(pz|pezzi|unità)/i,
      /\d+x\d+/i,
      /confezione/i,
      /formato/i
    ];
    
    const hasSize = sizePatterns.some(pattern => pattern.test(product));
    
    if (!hasSize) {
      console.log('Product missing details, completing with AI...');
      
      const completionPrompt = `Completa la descrizione del prodotto "${product}" per il supermercato "${chainName}" in Italia. 
      
Aggiungi dettagli realistici come: tipo specifico, formato esatto, marca comune italiana.

Rispondi SOLO con la descrizione completa del prodotto, nient'altro.
Esempi:
- "latte" → "Latte intero UHT Granarolo 1L"
- "pasta" → "Pasta penne rigate Barilla 500g"
- "acqua" → "Acqua minerale naturale Levissima 1.5L"`;

      try {
        const completionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: completionPrompt }],
          }),
        });

        if (completionResponse.ok) {
          const completionData = await completionResponse.json();
          finalProductDescription = completionData.choices[0].message.content.trim();
          wasCompleted = true;
          console.log('Completed product description:', finalProductDescription);
        }
      } catch (error) {
        console.error('Failed to complete product description:', error);
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Sei un assistente esperto di prezzi dei supermercati in Italia. Fornisci SOLO il prezzo medio in euro come numero decimale (es: 2.50).'
          },
          {
            role: 'user',
            content: `Prodotto: "${finalProductDescription}" al supermercato ${chainName}. Rispondi solo con il prezzo in euro.`
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
    
    // Parse the price from the response
    const priceMatch = priceText.match(/\d+[.,]?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

    console.log('Price search successful:', price);

    return new Response(
      JSON.stringify({ 
        price, 
        priceInfo: `€${price.toFixed(2)}`,
        completedProduct: wasCompleted ? finalProductDescription : null,
        needsDetails: false 
      }),
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
