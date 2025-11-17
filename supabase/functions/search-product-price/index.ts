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

    // FASE 1: Cache (7 giorni, qualsiasi punto vendita della stessa catena)
    console.log('\n🔍 Cache...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: cachedPrice } = await supabase
      .from('product_prices')
      .select('*')
      .ilike('product_name', normalizedProduct)
      .ilike('store_name', normalizedStore)
      .gte('created_at', sevenDaysAgo)
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

    console.log('\n💡 Ricerca AI...');
    
    const searchPrompt = `Trova il prezzo REALE di "${product}" da ${chainName} in Italia.

REGOLE:
1. Cerca su siti ufficiali, volantini digitali, comparatori italiani
2. SOLO prezzi verificabili da ${chainName}
3. Rispondi con il numero (es: 2.99) oppure "NON TROVATO"
4. NON inventare

Esempi:
€2,99 → 2.99
Non trovi → NON TROVATO`;

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: searchPrompt }],
          temperature: 0.1,
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        console.log(`  AI: ${aiResponse}`);

        const priceMatch = aiResponse.match(/(\d+[.,]\d{1,2})/);
        if (priceMatch) {
          const foundPrice = parseFloat(priceMatch[1].replace(',', '.'));
          if (foundPrice >= 0.10 && foundPrice <= 500) {
            console.log(`✓ Prezzo: €${foundPrice}`);
            
            // Salva in cache
            await supabase
              .from('product_prices')
              .upsert({
                product_name: normalizedProduct,
                store_name: normalizedStore,
                store_address: normalizedAddress,
                price: foundPrice,
                source: 'ai',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'product_name,store_name,store_address'
              });

            return new Response(
              JSON.stringify({ 
                price: foundPrice,
                priceInfo: `€${foundPrice.toFixed(2)}`,
                cached: false
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    } catch (error) {
      console.error('Errore AI:', error);
    }

    console.log('❌ Non trovato');
    return new Response(
      JSON.stringify({ 
        error: 'Prezzo non trovato',
        notFound: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
