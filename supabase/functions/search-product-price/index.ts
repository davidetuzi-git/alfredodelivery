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

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching price for product: ${product} at ${chainName}`);

    // Complete product description with AI
    let finalProductDescription = product;
    let wasCompleted = false;
    
    console.log('Completing product description with AI...');
    
    const completionPrompt = `Completa la descrizione del prodotto "${product}" per il supermercato "${chainName}" in Italia. 
    
Aggiungi dettagli realistici come: tipo specifico, formato esatto, marca comune italiana.

Rispondi SOLO con la descrizione completa del prodotto, nient'altro.
Esempi:
- "latte" → "Latte intero UHT Granarolo 1L"
- "latte 1L" → "Latte intero UHT Granarolo 1L"
- "pasta" → "Pasta penne rigate Barilla 500g"
- "acqua" → "Acqua minerale naturale Levissima 1.5L"`;

    try {
      const completionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: completionPrompt }]
          }],
        }),
      });

      if (completionResponse.ok) {
        const completionData = await completionResponse.json();
        finalProductDescription = completionData.candidates[0].content.parts[0].text.trim();
        wasCompleted = true;
        console.log('Completed product description:', finalProductDescription);
      }
    } catch (error) {
      console.error('Failed to complete product description:', error);
    }

    const systemPrompt = `Sei un assistente esperto di prezzi dei supermercati in Italia. 
Devi fornire il prezzo medio realistico del prodotto richiesto al supermercato specificato.
Rispondi SOLO con un numero decimale in euro (es: 2.50).
Se non conosci il prezzo esatto, fornisci una stima conservativa (leggermente alta) ma realistica.
NON rispondere mai con 0 o messaggi di errore, fornisci sempre una stima.`;

    const userPrompt = `Qual è il prezzo medio di "${finalProductDescription}" al supermercato ${chainName} in Italia?`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
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
    const priceText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the price from the response
    const priceMatch = priceText.match(/\d+[.,]?\d*/);
    let price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;
    
    // Se il prezzo è 0 o invalido, usa una stima conservativa basata sulla categoria
    if (price === 0 || isNaN(price) || price < 0.1) {
      console.log('Price not found or invalid, using fallback estimate');
      // Stima conservativa basata su prodotti comuni
      price = 3.99; // Prezzo medio conservativo
    }

    console.log('Price search successful:', price);

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
        completedProduct: wasCompleted ? finalProductDescription : null,
        imageUrl: imageUrl
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
