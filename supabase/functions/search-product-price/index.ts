import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract chain name
    const chainName = storeName.split(' - ')[0].trim();
    const normalizedProduct = product.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();

    console.log(`Searching price for product: ${product} at ${chainName}`);

    // Step 1: Check cache (< 4 days old)
    console.log('Checking price cache...');
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: cachedPrice, error: cacheError } = await supabase
      .from('product_prices')
      .select('*')
      .ilike('product_name', normalizedProduct)
      .ilike('store_name', normalizedStore)
      .gte('created_at', fourDaysAgo)
      .single();

    if (cachedPrice && !cacheError) {
      console.log('Found cached price:', cachedPrice.price);
      return new Response(
        JSON.stringify({ 
          price: cachedPrice.price,
          priceInfo: `€${cachedPrice.price}`,
          completedProduct: null,
          imageUrl: null,
          cached: true,
          cacheAge: Math.floor((Date.now() - new Date(cachedPrice.created_at).getTime()) / (1000 * 60 * 60 * 24)) + ' giorni'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No cached price found, searching online...');

    // Step 2: Search real prices online using AI
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to retry with exponential backoff
    const retryWithBackoff = async (fn: () => Promise<Response>, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fn();
          if (response.ok || response.status !== 503) {
            return response;
          }
          if (i < maxRetries - 1) {
            const waitTime = Math.pow(2, i) * 1000;
            console.log(`API overloaded, retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Complete product description
    let finalProductDescription = product;
    
    const completionPrompt = `Completa la descrizione del prodotto "${product}" per il supermercato "${chainName}" in Italia. 
Aggiungi dettagli realistici come: tipo specifico, formato esatto, marca comune italiana.
Rispondi SOLO con la descrizione completa del prodotto, nient'altro.
Esempi:
- "latte" → "Latte intero UHT Granarolo 1L"
- "pasta" → "Pasta penne rigate Barilla 500g"
- "acqua" → "Acqua minerale naturale Levissima 1.5L"`;

    try {
      const completionResponse = await retryWithBackoff(() => 
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: completionPrompt }] }],
          }),
        })
      );

      if (completionResponse.ok) {
        const completionData = await completionResponse.json();
        finalProductDescription = completionData.candidates[0].content.parts[0].text.trim();
        console.log('Completed product description:', finalProductDescription);
      }
    } catch (error) {
      console.error('Failed to complete product description:', error);
    }

    // Search for REAL price online
    const systemPrompt = `Sei un assistente esperto che cerca prezzi REALI dei supermercati italiani online.
IMPORTANTE: Devi cercare il prezzo REALE e ATTUALE del prodotto nel supermercato specificato.
- Cerca sui siti web ufficiali del supermercato
- Cerca su volantini online
- Cerca su comparatori di prezzi italiani
- Se NON trovi un prezzo REALE e VERIFICABILE, rispondi ESATTAMENTE con: "PREZZO NON TROVATO"
- NON inventare, NON stimare, NON indovinare il prezzo
- Rispondi SOLO con il numero (es: 2.50) oppure "PREZZO NON TROVATO"`;

    const userPrompt = `Cerca il prezzo REALE e ATTUALE di "${finalProductDescription}" al supermercato ${chainName} in Italia. Controlla il sito ufficiale, volantini online e comparatori di prezzi.`;
    
    let response;
    try {
      response = await retryWithBackoff(() =>
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }],
          }),
        })
      );
    } catch (error) {
      console.error('Failed to get price after retries, using fallback');
      // Return a conservative estimate
      return new Response(
        JSON.stringify({ 
          price: 3.99,
          priceInfo: `€3.99`,
          completedProduct: finalProductDescription !== product ? finalProductDescription : null,
          imageUrl: null,
          isEstimated: true,
          estimateReason: 'Servizio AI temporaneamente non disponibile'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ error: 'Prezzo non trovato - errore servizio AI' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const priceText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('AI response:', priceText);
    
    // Check if AI says price not found
    if (priceText.toUpperCase().includes('PREZZO NON TROVATO') || priceText.toUpperCase().includes('NON TROVATO')) {
      console.log('Price not found by AI');
      return new Response(
        JSON.stringify({ 
          error: 'Prezzo non trovato',
          message: `Non sono riuscito a trovare il prezzo di "${finalProductDescription}" presso ${chainName}. Prova con un prodotto più specifico o un altro supermercato.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the price from the response
    const priceMatch = priceText.match(/\d+[.,]?\d*/);
    let price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;
    
    // Se il prezzo è 0 o invalido, restituisci errore
    if (price === 0 || isNaN(price) || price < 0.1) {
      console.log('Invalid price received from AI');
      return new Response(
        JSON.stringify({ 
          error: 'Prezzo non trovato',
          message: `Non sono riuscito a trovare un prezzo valido per "${finalProductDescription}" presso ${chainName}.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Price found:', price);

    // Step 3: Save to cache
    try {
      await supabase.from('product_prices').upsert({
        product_name: normalizedProduct,
        store_name: normalizedStore,
        price: price,
        source: 'ai_search',
        updated_at: new Date().toISOString()
      });
      console.log('Price saved to cache');
    } catch (cacheError) {
      console.error('Failed to cache price:', cacheError);
    }

    // Step 4: Cleanup old prices in background (async, non-blocking)
    (async () => {
      try {
        await supabase.rpc('cleanup_old_prices');
        console.log('Old prices cleanup completed');
      } catch (err) {
        console.error('Cleanup failed:', err);
      }
    })();

    // Generate product image URL using Lovable AI Gateway
    let imageUrl = null;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    console.log('Attempting to generate product image...');
    console.log('LOVABLE_API_KEY exists:', !!LOVABLE_API_KEY);
    
    if (LOVABLE_API_KEY) {
      try {
        const imagePrompt = `Professional product photo of "${finalProductDescription}" on white background, high quality, commercial photography style, centered, well-lit, detailed, 800x800px`;
        
        console.log('Sending image generation request...');
        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: imagePrompt
              }
            ],
            modalities: ["image", "text"]
          })
        });

        console.log('Image generation response status:', imageResponse.status);
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          console.log('Product image generated successfully:', !!imageUrl);
        } else {
          const errorText = await imageResponse.text();
          console.error('Image generation failed:', imageResponse.status, errorText);
        }
      } catch (imageError) {
        console.error('Error generating product image:', imageError);
        // Continue without image if generation fails
      }
    } else {
      console.log('LOVABLE_API_KEY not configured, skipping image generation');
    }

    return new Response(
      JSON.stringify({ 
        price, 
        priceInfo: `€${price.toFixed(2)}`,
        completedProduct: finalProductDescription !== product ? finalProductDescription : null,
        imageUrl: imageUrl,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-product-price function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Errore nella ricerca del prezzo',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
