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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const storeNameParts = storeName.split(' - ');
    const chainName = storeNameParts[0].trim();
    const storeAddress = storeNameParts.length > 1 ? storeNameParts.slice(1).join(' - ').trim() : '';
    
    // Estrai città/provincia dall'indirizzo
    const locationMatch = storeAddress.match(/,\s*([^,]+)$/);
    const city = locationMatch ? locationMatch[1].trim() : '';
    
    const normalizedProduct = product.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();
    const normalizedAddress = storeAddress.toLowerCase();

    console.log(`=== RICERCA PREZZO ===`);
    console.log(`Prodotto: ${product}`);
    console.log(`Catena: ${chainName}`);
    console.log(`Indirizzo: ${storeAddress}`);
    console.log(`Città: ${city}`);

    // FASE 1: Cache (30 giorni, qualsiasi punto vendita della stessa catena)
    console.log('\n🔍 Cache...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: cachedPrice } = await supabase
      .from('product_prices')
      .select('*')
      .ilike('product_name', normalizedProduct)
      .ilike('store_name', normalizedStore)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedPrice) {
      console.log(`✓ TROVATO in cache: €${cachedPrice.price}`);
      return new Response(
        JSON.stringify({ 
          price: cachedPrice.price,
          priceInfo: `€${cachedPrice.price.toFixed(2)}`,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✗ Non in cache');

    // FASE 2: Ricerca AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Prezzo non trovato', notFound: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n💡 Ricerca AI con CASCATA GEOGRAFICA...');
    
    const searchPrompt = `Trova il prezzo di "${product}" presso ${chainName}.
Negozio: ${storeAddress}
Città: ${city || 'Italia'}

STRATEGIA DI RICERCA OBBLIGATORIA (in ordine):

1️⃣ CERCA PRIMA: Prezzo ${chainName} a ${city}
   - Volantino digitale ${chainName} zona ${city}
   - Offerte ${chainName} punto vendita a ${city}
   
2️⃣ SE NON TROVI: Prezzo ${chainName} in provincia di ${city}
   - Volantini ${chainName} città limitrofe
   - Prezzi ${chainName} nella provincia
   
3️⃣ SE NON TROVI: Prezzo ${chainName} nel capoluogo di regione
   - Verifica il capoluogo della regione dove si trova ${city}
   - Cerca volantini ${chainName} del capoluogo regionale

4️⃣ SE ${chainName} NON È CATENA FAMOSA: Usa catena simile
   - Identifica la catena più simile a ${chainName} (es: Eurospin→MD, Conad→Coop, Lidl→Penny)
   - Cerca prezzi della catena simile con stessa strategia geografica

5️⃣ FALLBACK FINALE: Stima realistica
   - Basati su range prezzi tipici per quel prodotto in Italia
   - Considera il tipo di catena (discount, premium, normale)

REGOLE:
- DEVI SEMPRE rispondere con un numero (es: 2.99)
- Preferisci prezzi reali da volantini/siti ufficiali
- Se stimi, usa prezzi ragionevoli per il tipo di prodotto

Rispondi SOLO con il numero del prezzo in euro (es: 2.99)`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 secondi per modello più potente
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro', // Modello più potente per ricerca accurata
          messages: [{ role: 'user', content: searchPrompt }],
          temperature: 0.3,
          max_tokens: 30,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        console.log(`  AI Prezzo: ${aiResponse}`);

        const priceMatch = aiResponse.match(/(\d+[.,]\d{1,2})/);
        if (priceMatch) {
          const foundPrice = parseFloat(priceMatch[1].replace(',', '.'));
          if (foundPrice >= 0.10 && foundPrice <= 500) {
            console.log(`✓ Prezzo trovato/stimato: €${foundPrice}`);
            
            // COMPLETAMENTO NOME PRODOTTO
            console.log('\n🏷️ Completamento nome prodotto...');
            let completedProductName = product;
            
            try {
              const completionPrompt = `Prodotto: "${product}"
Catena: ${chainName}

Completa il nome del prodotto in modo preciso e professionale.
REGOLE:
- Se il prodotto è generico (es: "pasta"), suggerisci un formato comune (es: "Pasta di semola 500g")
- Includi peso/formato tipico se manca (es: 1kg, 500g, 1L)
- Mantieni il nome semplice ma completo
- NON inventare marche specifiche
- Prodotti sono standardizzati in tutta Italia

Esempi:
"latte" → "Latte fresco intero 1L"
"pane" → "Pane tipo 00 400g"
"pasta" → "Pasta di semola 500g"

Rispondi SOLO con il nome completo del prodotto (max 50 caratteri)`;

              const completionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [{ role: 'user', content: completionPrompt }],
                  temperature: 0.3,
                  max_tokens: 50,
                }),
              });

              if (completionResponse.ok) {
                const completionData = await completionResponse.json();
                const suggestedName = completionData.choices[0].message.content.trim();
                if (suggestedName && suggestedName.length > 3 && suggestedName.length <= 100) {
                  completedProductName = suggestedName;
                  console.log(`✓ Nome completato: ${completedProductName}`);
                }
              }
            } catch (e) {
              console.log('⚠️ Completamento nome fallito, uso nome originale');
            }
            
            // Salva in cache
            await supabase
              .from('product_prices')
              .upsert({
                product_name: normalizedProduct,
                store_name: normalizedStore,
                store_address: normalizedAddress,
                price: foundPrice,
                source: 'ai_estimate',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'product_name,store_name,store_address'
              });

            return new Response(
              JSON.stringify({ 
                price: foundPrice,
                priceInfo: `€${foundPrice.toFixed(2)}`,
                cached: false,
                estimated: true,
                completedProduct: completedProductName
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error && error.name === 'AbortError' ? 'Timeout' : String(error);
      console.error('Errore/Timeout AI:', errorMsg);
    }

    // Fallback: prezzo medio stimato per categoria prodotto
    console.log('⚠️ Usando stima fallback');
    const fallbackPrice = 2.99; // Prezzo medio generico
    
    return new Response(
      JSON.stringify({ 
        price: fallbackPrice,
        priceInfo: `€${fallbackPrice.toFixed(2)}`,
        cached: false,
        estimated: true,
        fallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
