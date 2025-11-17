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

    // Extract chain name and address
    const storeNameParts = storeName.split(' - ');
    const chainName = storeNameParts[0].trim();
    const storeAddress = storeNameParts.length > 1 ? storeNameParts.slice(1).join(' - ').trim() : '';
    
    const normalizedProduct = product.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();
    const normalizedAddress = storeAddress.toLowerCase();

    console.log(`=== SEARCHING PRICE ===`);
    console.log(`Product: ${product}`);
    console.log(`Store: ${chainName}`);
    console.log(`Address: ${storeAddress}`);

    // ==== FASE 1: Database Cache (stesso negozio, stesso indirizzo, < 4 giorni) ====
    console.log('\n🔍 FASE 1: Checking database cache...');
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: cachedPrice, error: cacheError } = await supabase
      .from('product_prices')
      .select('*')
      .ilike('product_name', normalizedProduct)
      .ilike('store_name', normalizedStore)
      .ilike('store_address', normalizedAddress)
      .gte('created_at', fourDaysAgo)
      .single();

    if (cachedPrice && !cacheError) {
      const cacheAgeDays = Math.floor((Date.now() - new Date(cachedPrice.created_at).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`✓ FOUND in cache: €${cachedPrice.price} (${cacheAgeDays} giorni fa)`);
      
      return new Response(
        JSON.stringify({ 
          price: cachedPrice.price,
          priceInfo: `€${cachedPrice.price.toFixed(2)}`,
          completedProduct: null,
          imageUrl: null,
          cached: true,
          source: 'database_cache',
          cacheAge: `${cacheAgeDays} ${cacheAgeDays === 1 ? 'giorno' : 'giorni'}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✗ Not found in cache');

    // ==== FASE 2 & 3: AI Search + Google Search ====
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!GOOGLE_AI_API_KEY && !LOVABLE_API_KEY) {
      console.error('No AI API keys configured');
      return new Response(
        JSON.stringify({ error: 'Prezzo non trovato', notFound: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper: retry with exponential backoff
    const retryWithBackoff = async (fn: () => Promise<Response>, maxRetries = 2) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fn();
          if (response.ok || response.status !== 503) return response;
          if (i < maxRetries - 1) {
            const waitTime = Math.pow(2, i) * 1000;
            console.log(`  API overloaded, retry in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Helper: Call Lovable AI as backup
    const callLovableAI = async (prompt: string) => {
      if (!LOVABLE_API_KEY) throw new Error('Lovable API key not available');
      
      console.log('  🔄 Using Lovable AI backup...');
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    };

    // Complete product description
    let finalProductDescription = product;
    try {
      let completionText = '';
      
      if (GOOGLE_AI_API_KEY) {
        try {
          const completionResponse = await retryWithBackoff(() => 
            fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Completa: "${product}" → descrizione specifica con marca e formato. Solo la descrizione, nulla altro.` }] }],
              }),
            })
          );

          if (completionResponse.ok) {
            const data = await completionResponse.json();
            completionText = data.candidates[0].content.parts[0].text.trim();
          }
        } catch (googleError) {
          console.log('  Google AI failed, trying Lovable AI backup...');
          completionText = await callLovableAI(`Completa: "${product}" → descrizione specifica con marca e formato. Solo la descrizione, nulla altro.`);
        }
      } else {
        completionText = await callLovableAI(`Completa: "${product}" → descrizione specifica con marca e formato. Solo la descrizione, nulla altro.`);
      }

      if (completionText) {
        finalProductDescription = completionText.trim();
        console.log(`  Completed: ${finalProductDescription}`);
      }
    } catch (error) {
      console.error('  Failed to complete description:', error);
    }

    console.log('\n🤖 FASE 2: AI Search (official websites, flyers)...');
    
    const aiPrompt = `Trova il prezzo REALE di "${finalProductDescription}" presso ${chainName} ${storeAddress ? 'a ' + storeAddress : ''}, Italia.

Cerca su:
1. Sito ufficiale ${chainName}
2. Volantini online ${chainName}
3. Comparatori prezzi italiani (Trovaprezzi, Altroconsumo, ecc.)

RISPOSTA:
- Se trovi prezzo VERIFICABILE → scrivi SOLO il numero (es: "2.50")
- Se NON trovi → scrivi "NON TROVATO"

NON stimare, NON inventare!`;

    let foundPrice = null;
    let source = null;

    try {
      let aiText = '';
      
      if (GOOGLE_AI_API_KEY) {
        try {
          const aiResponse = await retryWithBackoff(() =>
            fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: aiPrompt }] }],
              }),
            })
          );

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiText = (aiData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
          }
        } catch (googleError) {
          console.log('  Google AI failed, trying Lovable AI backup...');
          aiText = await callLovableAI(aiPrompt);
        }
      } else {
        aiText = await callLovableAI(aiPrompt);
      }

      console.log(`  AI response: ${aiText}`);
      
      if (aiText && !aiText.toUpperCase().includes('NON TROVATO')) {
        const priceMatch = aiText.match(/\d+[.,]?\d*/);
        if (priceMatch) {
          const parsedPrice = parseFloat(priceMatch[0].replace(',', '.'));
          if (parsedPrice > 0.1 && parsedPrice < 999) {
            foundPrice = parsedPrice;
            source = 'ai_search';
            console.log(`✓ AI FOUND: €${foundPrice}`);
          }
        }
      }
    } catch (error) {
      console.error('  AI search error:', error);
    }

    // ==== FASE 3: Google Search (se AI non ha trovato) ====
    if (!foundPrice) {
      console.log('\n🔍 FASE 3: Google Search...');
      
      const googlePrompt = `Cerca su Google il prezzo di "${finalProductDescription}" presso ${chainName} ${storeAddress}.

Query Google da usare: "${finalProductDescription} prezzo ${chainName} ${storeAddress || 'Italia'}"

Analizza risultati e:
- Se trovi prezzo ATTENDIBILE → numero (es: "3.20")
- Se NON trovi → "NON TROVATO"

Fonti attendibili: siti ufficiali, comparatori, volantini.
NON inventare!`;

      try {
        let googleText = '';
        
        if (GOOGLE_AI_API_KEY) {
          try {
            const googleResponse = await retryWithBackoff(() =>
              fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: googlePrompt }] }],
                }),
              })
            );

            if (googleResponse.ok) {
              const googleData = await googleResponse.json();
              googleText = (googleData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            }
          } catch (googleError) {
            console.log('  Google AI failed, trying Lovable AI backup...');
            googleText = await callLovableAI(googlePrompt);
          }
        } else {
          googleText = await callLovableAI(googlePrompt);
        }

        console.log(`  Google search result: ${googleText}`);
        
        if (googleText && !googleText.toUpperCase().includes('NON TROVATO')) {
          const priceMatch = googleText.match(/\d+[.,]?\d*/);
          if (priceMatch) {
            const parsedPrice = parseFloat(priceMatch[0].replace(',', '.'));
            if (parsedPrice > 0.1 && parsedPrice < 999) {
              foundPrice = parsedPrice;
              source = 'google_search';
              console.log(`✓ GOOGLE FOUND: €${foundPrice}`);
            }
          }
        }
      } catch (error) {
        console.error('  Google search error:', error);
      }
    }

    // ==== FASE 4: Prezzo Non Trovato ====
    if (!foundPrice) {
      console.log('\n✗ FASE 4: PREZZO NON TROVATO');
      return new Response(
        JSON.stringify({ 
          error: 'Prezzo non trovato',
          notFound: true,
          message: `Impossibile trovare il prezzo di "${finalProductDescription}" presso ${chainName}${storeAddress ? ' a ' + storeAddress : ''}.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==== SUCCESS: Save to cache ====
    console.log(`\n💾 Saving to cache: €${foundPrice} (source: ${source})`);
    try {
      await supabase.from('product_prices').upsert({
        product_name: normalizedProduct,
        store_name: normalizedStore,
        store_address: normalizedAddress,
        price: foundPrice,
        source: source,
        updated_at: new Date().toISOString()
      });
      
      // Cleanup old prices (async, non-blocking)
      (async () => {
        try {
          await supabase.rpc('cleanup_old_prices');
          console.log('✓ Old prices cleaned up');
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      })();
      
    } catch (cacheErr) {
      console.error('Failed to save to cache:', cacheErr);
    }

    return new Response(
      JSON.stringify({ 
        price: foundPrice,
        priceInfo: `€${foundPrice.toFixed(2)}`,
        completedProduct: finalProductDescription !== product ? finalProductDescription : null,
        imageUrl: null,
        cached: false,
        source: source
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Errore nella ricerca del prezzo',
        notFound: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
