import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping di province e capoluoghi regionali italiani
const PROVINCE_TO_REGION: Record<string, { region: string; capital: string }> = {
  'roma': { region: 'Lazio', capital: 'Roma' },
  'milano': { region: 'Lombardia', capital: 'Milano' },
  'napoli': { region: 'Campania', capital: 'Napoli' },
  'torino': { region: 'Piemonte', capital: 'Torino' },
  'palermo': { region: 'Sicilia', capital: 'Palermo' },
  'genova': { region: 'Liguria', capital: 'Genova' },
  'bologna': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'firenze': { region: 'Toscana', capital: 'Firenze' },
  'bari': { region: 'Puglia', capital: 'Bari' },
  'catania': { region: 'Sicilia', capital: 'Palermo' },
  'venezia': { region: 'Veneto', capital: 'Venezia' },
  'verona': { region: 'Veneto', capital: 'Venezia' },
  'messina': { region: 'Sicilia', capital: 'Palermo' },
  'padova': { region: 'Veneto', capital: 'Venezia' },
  'trieste': { region: 'Friuli-Venezia Giulia', capital: 'Trieste' },
  'brescia': { region: 'Lombardia', capital: 'Milano' },
  'parma': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'modena': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'reggio emilia': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'reggio calabria': { region: 'Calabria', capital: 'Catanzaro' },
  'perugia': { region: 'Umbria', capital: 'Perugia' },
  'livorno': { region: 'Toscana', capital: 'Firenze' },
  'ravenna': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'cagliari': { region: 'Sardegna', capital: 'Cagliari' },
  'foggia': { region: 'Puglia', capital: 'Bari' },
  'rimini': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'salerno': { region: 'Campania', capital: 'Napoli' },
  'ferrara': { region: 'Emilia-Romagna', capital: 'Bologna' },
  'sassari': { region: 'Sardegna', capital: 'Cagliari' },
  'latina': { region: 'Lazio', capital: 'Roma' },
  'anzio': { region: 'Lazio', capital: 'Roma' },
  'nettuno': { region: 'Lazio', capital: 'Roma' },
  'aprilia': { region: 'Lazio', capital: 'Roma' },
  'pomezia': { region: 'Lazio', capital: 'Roma' },
  'monza': { region: 'Lombardia', capital: 'Milano' },
  'bergamo': { region: 'Lombardia', capital: 'Milano' },
  'como': { region: 'Lombardia', capital: 'Milano' },
  'varese': { region: 'Lombardia', capital: 'Milano' },
  'pescara': { region: 'Abruzzo', capital: "L'Aquila" },
  'teramo': { region: 'Abruzzo', capital: "L'Aquila" },
  'chieti': { region: 'Abruzzo', capital: "L'Aquila" },
  "l'aquila": { region: 'Abruzzo', capital: "L'Aquila" },
  'avezzano': { region: 'Abruzzo', capital: "L'Aquila" },
};

// Catene discount simili per fallback
const SIMILAR_CHAINS: Record<string, string[]> = {
  'eurospin': ['md', 'lidl', 'penny', 'aldi', "in's"],
  'lidl': ['eurospin', 'md', 'penny', 'aldi'],
  'md': ['eurospin', 'lidl', 'penny', 'aldi'],
  'penny': ['lidl', 'eurospin', 'md', 'aldi'],
  'aldi': ['lidl', 'eurospin', 'md', 'penny'],
  "in's": ['eurospin', 'md', 'lidl'],
  'conad': ['coop', 'esselunga', 'carrefour', 'pam'],
  'coop': ['conad', 'esselunga', 'carrefour', 'pam'],
  'esselunga': ['coop', 'conad', 'carrefour', 'pam'],
  'carrefour': ['coop', 'conad', 'esselunga', 'pam'],
  'pam': ['coop', 'conad', 'carrefour', 'esselunga'],
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
    const cityLower = city.toLowerCase();
    
    // Determina la regione e il capoluogo
    const regionInfo = PROVINCE_TO_REGION[cityLower] || { region: 'Italia', capital: city };
    
    const normalizedProduct = product.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();
    const normalizedAddress = storeAddress.toLowerCase();

    console.log(`=== RICERCA PREZZO ===`);
    console.log(`Prodotto: ${product}`);
    console.log(`Catena: ${chainName}`);
    console.log(`Indirizzo: ${storeAddress}`);
    console.log(`Città: ${city}`);
    console.log(`Regione: ${regionInfo.region}, Capoluogo: ${regionInfo.capital}`);

    // FASE 1: Cache (30 giorni, qualsiasi punto vendita della stessa catena)
    console.log('\n🔍 FASE 1: Ricerca in cache...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: cachedPrice } = await supabase
      .from('product_prices')
      .select('*')
      .ilike('product_name', `%${normalizedProduct}%`)
      .ilike('store_name', `%${normalizedStore}%`)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let foundPrice: number | null = null;
    let priceFromCache = false;
    let priceSource = 'unknown';
    
    if (cachedPrice) {
      console.log(`✓ TROVATO in cache: €${cachedPrice.price}`);
      foundPrice = cachedPrice.price;
      priceFromCache = true;
      priceSource = 'cache';
    } else {
      console.log('✗ Non in cache');
    }

    // FASE 2-5: Ricerca AI con cascata geografica
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!priceFromCache) {
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'API key non configurata', notFound: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const similarChains = SIMILAR_CHAINS[normalizedStore] || [];
      
      // Prompt migliorato per ricerca reale
      const searchPrompt = `SEI UN ESPERTO DI PREZZI SUPERMERCATI ITALIANI.

PRODOTTO DA CERCARE: "${product}"
CATENA: ${chainName}
CITTÀ: ${city}
PROVINCIA/REGIONE: ${regionInfo.region}
CAPOLUOGO REGIONALE: ${regionInfo.capital}

🔴 STRATEGIA DI RICERCA OBBLIGATORIA (SEGUI QUESTO ORDINE):

STEP 1 - CITTÀ LOCALE:
Cerca il prezzo REALE di "${product}" nei volantini/listini ${chainName} di ${city}.
- Controlla volantini settimanali ${chainName}
- Verifica prezzi pubblicati su siti ufficiali

STEP 2 - PROVINCIA:
Se Step 1 fallisce, cerca nei ${chainName} della provincia di ${city}.
- Volantini ${chainName} città vicine

STEP 3 - CAPOLUOGO REGIONALE:
Se Step 2 fallisce, cerca nei ${chainName} di ${regionInfo.capital}.
- ${chainName} ${regionInfo.capital} prezzi correnti

STEP 4 - CATENE SIMILI:
Se ${chainName} non vende "${product}", cerca in catene SIMILI:
${similarChains.length > 0 ? `Catene simili a ${chainName}: ${similarChains.join(', ')}` : 'Cerca in altre catene discount/supermercati'}

STEP 5 - MEDIA NAZIONALE:
Solo come ULTIMA RISORSA, fornisci il prezzo medio italiano per "${product}".

⚠️ REGOLE TASSATIVE:
1. DEVI fornire UN NUMERO (es: 1.29)
2. Preferisci SEMPRE prezzi da volantini reali
3. Per prodotti base (latte, pane, pasta): i prezzi discount sono 0.69-1.50€
4. NON inventare prezzi impossibili
5. Considera che ${chainName} è ${normalizedStore.includes('eurospin') || normalizedStore.includes('lidl') || normalizedStore.includes('md') || normalizedStore.includes('penny') ? 'un DISCOUNT (prezzi bassi)' : 'un supermercato tradizionale'}

RISPONDI SOLO CON IL NUMERO DEL PREZZO (es: 1.29)`;

      console.log('\n💡 FASE 2-5: Ricerca AI con cascata geografica...');
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
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
            temperature: 0.1, // Più deterministico
            max_tokens: 50,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices[0].message.content.trim();
          console.log(`  AI Risposta: ${aiResponse}`);

          const priceMatch = aiResponse.match(/(\d+[.,]\d{1,2})/);
          
          if (priceMatch) {
            const parsedPrice = parseFloat(priceMatch[1].replace(',', '.'));
            if (parsedPrice >= 0.10 && parsedPrice <= 500) {
              foundPrice = parsedPrice;
              priceSource = 'ai_search';
              console.log(`✓ Prezzo trovato: €${foundPrice}`);
            }
          }
        } else {
          console.log(`✗ Errore AI: ${response.status}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error && error.name === 'AbortError' ? 'Timeout' : String(error);
        console.error('Errore AI:', errorMsg);
      }
      
      // Fallback con prezzo medio per categoria se ancora nullo
      if (foundPrice === null) {
        console.log('\n⚠️ Fallback: stima prezzo per categoria...');
        const productLower = product.toLowerCase();
        
        // Prezzi medi per categoria in discount
        if (productLower.includes('latte')) foundPrice = 1.09;
        else if (productLower.includes('pane')) foundPrice = 1.29;
        else if (productLower.includes('pasta')) foundPrice = 0.89;
        else if (productLower.includes('riso')) foundPrice = 1.49;
        else if (productLower.includes('uova') || productLower.includes('uovo')) foundPrice = 2.29;
        else if (productLower.includes('burro')) foundPrice = 2.49;
        else if (productLower.includes('olio')) foundPrice = 5.99;
        else if (productLower.includes('zucchero')) foundPrice = 1.19;
        else if (productLower.includes('caffè') || productLower.includes('caffe')) foundPrice = 3.99;
        else if (productLower.includes('acqua')) foundPrice = 0.29;
        else if (productLower.includes('birra')) foundPrice = 1.29;
        else if (productLower.includes('vino')) foundPrice = 3.99;
        else foundPrice = 2.49; // Prezzo medio generico
        
        priceSource = 'category_estimate';
        console.log(`  Prezzo stimato per categoria: €${foundPrice}`);
      }
    }
        
    // COMPLETAMENTO NOME PRODOTTO - SEMPRE ESEGUITO (anche con cache)
    console.log('\n🏷️ Completamento nome prodotto con brand...');
    let completedProductName = product;
    let productAvailable = true;
    let suggestedAlternative = null;
    
    if (!LOVABLE_API_KEY) {
      console.log('⚠️ LOVABLE_API_KEY non disponibile, skip completamento nome');
    } else {
      try {
        const completionPrompt = `Prodotto: "${product}"
Catena: ${chainName}
Città: ${city || 'Italia'}

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
            
            // CERCA IL PREZZO DEL PRODOTTO ALTERNATIVO solo se non era in cache
            if (!priceFromCache) {
              console.log(`\n💰 Ricerca prezzo del prodotto alternativo...`);
              const alternativePricePrompt = `Trova il prezzo di "${suggestedAlternative}" presso ${chainName}.
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

4️⃣ FALLBACK FINALE: Stima realistica
   - Basati su range prezzi tipici per quel prodotto in Italia
   - Considera il tipo di catena (discount, premium, normale)

REGOLE:
- DEVI SEMPRE rispondere con un numero (es: 2.99)
- Preferisci prezzi reali da volantini/siti ufficiali
- Se stimi, usa prezzi ragionevoli per il tipo di prodotto

Rispondi SOLO con il numero del prezzo in euro (es: 2.99)`;

              try {
                const alternativePriceResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-pro',
                    messages: [{ role: 'user', content: alternativePricePrompt }],
                    temperature: 0.2,
                    max_tokens: 100,
                  }),
                });

                if (alternativePriceResponse.ok) {
                  const alternativePriceData = await alternativePriceResponse.json();
                  const alternativePriceStr = alternativePriceData.choices[0].message.content.trim();
                  console.log(`  AI Prezzo alternativa: ${alternativePriceStr}`);

                  const alternativePriceMatch = alternativePriceStr.match(/(\d+[.,]\d{1,2})/);
                  if (alternativePriceMatch) {
                    const parsedAlternativePrice = parseFloat(alternativePriceMatch[1].replace(',', '.'));
                    if (parsedAlternativePrice >= 0.10 && parsedAlternativePrice <= 500) {
                      foundPrice = parsedAlternativePrice;
                      console.log(`✓ Prezzo alternativa trovato: €${foundPrice}`);
                    }
                  }
                }
              } catch (e) {
                console.log('⚠️ Ricerca prezzo alternativa fallita:', e);
              }
            }
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
    }
        
    // GENERAZIONE IMMAGINE - SEMPRE ESEGUITA
    console.log('\n📸 Generazione immagine prodotto...');
    let productImageUrl = null;
    
    if (!LOVABLE_API_KEY) {
      console.log('⚠️ LOVABLE_API_KEY non disponibile, skip generazione immagine');
    } else {
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
    }
        
    // Salva in cache solo se non era già in cache
    if (!priceFromCache) {
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
    }

    const finalPrice = foundPrice ?? 2.49; // Ultimate fallback
    
    const responseData = { 
      price: finalPrice,
      priceInfo: `€${finalPrice.toFixed(2)}`,
      cached: priceFromCache,
      estimated: !priceFromCache,
      priceSource,
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

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});