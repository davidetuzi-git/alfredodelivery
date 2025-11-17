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
    
    const normalizedProduct = product.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();
    const normalizedAddress = storeAddress.toLowerCase();

    console.log(`=== RICERCA PREZZO ===`);
    console.log(`Prodotto: ${product}`);
    console.log(`Catena: ${chainName}`);

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

    console.log('\n💡 Ricerca AI prezzo (OBBLIGATORIO)...');
    
    const searchPrompt = `Trova il prezzo di "${product}" da ${chainName} in Italia.

REGOLE OBBLIGATORIE:
1. Cerca il prezzo REALE su siti ufficiali, volantini, comparatori
2. Se NON trovi il prezzo esatto, DEVI stimare un prezzo realistico basandoti su:
   - Prezzi di prodotti simili dello stesso supermercato
   - Prezzi medi di mercato per quel tipo di prodotto
   - Categoria del prodotto (es: frutta/verdura €1-3/kg, pasta €0.50-2, carne €8-15/kg)
3. DEVI SEMPRE rispondere con un numero (es: 2.99)
4. NON rispondere MAI con "NON TROVATO" o testi
5. Il prezzo deve essere realistico per il mercato italiano

Rispondi SOLO con il numero del prezzo (es: 2.99)`;

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
        console.log(`  AI: ${aiResponse}`);

        const priceMatch = aiResponse.match(/(\d+[.,]\d{1,2})/);
        if (priceMatch) {
          const foundPrice = parseFloat(priceMatch[1].replace(',', '.'));
          if (foundPrice >= 0.10 && foundPrice <= 500) {
            console.log(`✓ Prezzo trovato/stimato: €${foundPrice}`);
            
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
                estimated: true
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
