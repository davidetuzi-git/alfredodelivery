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
          model: 'google/gemini-2.5-pro',
          messages: [{ 
            role: 'user', 
            content: searchPrompt 
          }],
          temperature: 0.2,
          max_tokens: 100,
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
            
            // COMPLETAMENTO NOME PRODOTTO CON BRAND E VERIFICA DISPONIBILITÀ
            console.log('\n🏷️ Completamento nome prodotto con brand...');
            let completedProductName = product;
            let productAvailable = true;
            let suggestedAlternative = null;
            
            try {
              const completionPrompt = `Prodotto: "${product}"
Catena: ${chainName}
Città: ${city}

ANALIZZA E COMPLETA:
1. Verifica se "${product}" è venduto da ${chainName}
2. Se NON è venduto (es: Nutella non in Eurospin, prodotti Esselunga Solo in Esselunga):
   - Suggerisci l'alternativa PIÙ SIMILE venduta da ${chainName}
   - Include il BRAND della catena se esiste
3. Se È venduto, completa il nome includendo:
   - BRAND (se applicabile)
   - Formato/peso standard
   - Descrizione chiara

FORMATO RISPOSTA:
Se venduto: "BRAND Nome Prodotto formato"
Se NON venduto: "ALTERNATIVA|BRAND Nome Alternativa formato"

Esempi:
"nutella" + Eurospin → "ALTERNATIVA|Eurospin Crema Spalmabile Nocciola 400g"
"latte" + Conad → "Conad Latte Fresco Intero 1L"
"pasta" + Lidl → "Combino Pasta di Semola 500g"

Rispondi SOLO con il nome (max 60 caratteri)`;

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
                  max_tokens: 80,
                }),
              });

              if (completionResponse.ok) {
                const completionData = await completionResponse.json();
                const suggestedName = completionData.choices[0].message.content.trim();
                console.log(`  AI Completamento risposta: "${suggestedName}"`);
                
                if (suggestedName.startsWith('ALTERNATIVA|')) {
                  productAvailable = false;
                  suggestedAlternative = suggestedName.replace('ALTERNATIVA|', '');
                  completedProductName = suggestedAlternative;
                  console.log(`⚠️ Prodotto non disponibile. Alternativa: ${suggestedAlternative}`);
                } else if (suggestedName && suggestedName.length > 3 && suggestedName.length <= 100) {
                  completedProductName = suggestedName;
                  console.log(`✓ Nome completato: ${completedProductName}`);
                }
              } else {
                console.log(`✗ Errore completamento: ${completionResponse.status}`);
              }
            } catch (e) {
              console.log('⚠️ Completamento nome fallito:', e);
            }
            
            // GENERAZIONE IMMAGINE PRODOTTO
            console.log('\n📸 Generazione immagine prodotto...');
            let productImageUrl = null;
            
            try {
              const imagePrompt = `Fotografia professionale di prodotto: ${completedProductName} venduto da ${chainName}.
Stile: foto realistica di prodotto su sfondo bianco, come nei cataloghi di supermercato.
Dettagli: packaging del prodotto visibile, etichetta leggibile se possibile, illuminazione professionale.
${chainName === 'Eurospin' ? 'Include marchio Eurospin se applicabile.' : ''}
${chainName === 'Lidl' ? 'Include marchio Lidl/Combino se applicabile.' : ''}
${chainName === 'Conad' ? 'Include marchio Conad se applicabile.' : ''}
Alta qualità, realistica, professionale.`;

              const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash-image',
                  messages: [{
                    role: 'user',
                    content: imagePrompt
                  }],
                  modalities: ['image', 'text']
                }),
              });

              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                if (generatedImage) {
                  productImageUrl = generatedImage;
                  console.log('✓ Immagine generata');
                }
              }
            } catch (e) {
              console.log('⚠️ Generazione immagine fallita');
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

            const responseData = { 
              price: foundPrice,
              priceInfo: `€${foundPrice.toFixed(2)}`,
              cached: false,
              estimated: true,
              completedProduct: completedProductName,
              productAvailable,
              suggestedAlternative,
              imageUrl: productImageUrl
            };
            
            console.log('📦 Response finale:', JSON.stringify(responseData));
            
            return new Response(
              JSON.stringify(responseData),
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
