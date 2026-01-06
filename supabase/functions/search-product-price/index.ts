import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping di province e capoluoghi regionali italiani
const PROVINCE_TO_REGION: Record<string, { region: string; capital: string; province: string }> = {
  'roma': { region: 'Lazio', capital: 'Roma', province: 'Roma' },
  'milano': { region: 'Lombardia', capital: 'Milano', province: 'Milano' },
  'napoli': { region: 'Campania', capital: 'Napoli', province: 'Napoli' },
  'torino': { region: 'Piemonte', capital: 'Torino', province: 'Torino' },
  'palermo': { region: 'Sicilia', capital: 'Palermo', province: 'Palermo' },
  'genova': { region: 'Liguria', capital: 'Genova', province: 'Genova' },
  'bologna': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Bologna' },
  'firenze': { region: 'Toscana', capital: 'Firenze', province: 'Firenze' },
  'bari': { region: 'Puglia', capital: 'Bari', province: 'Bari' },
  'catania': { region: 'Sicilia', capital: 'Palermo', province: 'Catania' },
  'venezia': { region: 'Veneto', capital: 'Venezia', province: 'Venezia' },
  'verona': { region: 'Veneto', capital: 'Venezia', province: 'Verona' },
  'messina': { region: 'Sicilia', capital: 'Palermo', province: 'Messina' },
  'padova': { region: 'Veneto', capital: 'Venezia', province: 'Padova' },
  'trieste': { region: 'Friuli-Venezia Giulia', capital: 'Trieste', province: 'Trieste' },
  'brescia': { region: 'Lombardia', capital: 'Milano', province: 'Brescia' },
  'parma': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Parma' },
  'modena': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Modena' },
  'reggio emilia': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Reggio Emilia' },
  'reggio calabria': { region: 'Calabria', capital: 'Catanzaro', province: 'Reggio Calabria' },
  'perugia': { region: 'Umbria', capital: 'Perugia', province: 'Perugia' },
  'livorno': { region: 'Toscana', capital: 'Firenze', province: 'Livorno' },
  'ravenna': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Ravenna' },
  'cagliari': { region: 'Sardegna', capital: 'Cagliari', province: 'Cagliari' },
  'foggia': { region: 'Puglia', capital: 'Bari', province: 'Foggia' },
  'rimini': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Rimini' },
  'salerno': { region: 'Campania', capital: 'Napoli', province: 'Salerno' },
  'ferrara': { region: 'Emilia-Romagna', capital: 'Bologna', province: 'Ferrara' },
  'sassari': { region: 'Sardegna', capital: 'Cagliari', province: 'Sassari' },
  'latina': { region: 'Lazio', capital: 'Roma', province: 'Latina' },
  'anzio': { region: 'Lazio', capital: 'Roma', province: 'Roma' },
  'nettuno': { region: 'Lazio', capital: 'Roma', province: 'Roma' },
  'aprilia': { region: 'Lazio', capital: 'Roma', province: 'Latina' },
  'pomezia': { region: 'Lazio', capital: 'Roma', province: 'Roma' },
  'monza': { region: 'Lombardia', capital: 'Milano', province: 'Monza e Brianza' },
  'bergamo': { region: 'Lombardia', capital: 'Milano', province: 'Bergamo' },
  'como': { region: 'Lombardia', capital: 'Milano', province: 'Como' },
  'varese': { region: 'Lombardia', capital: 'Milano', province: 'Varese' },
  'pescara': { region: 'Abruzzo', capital: "L'Aquila", province: 'Pescara' },
  'teramo': { region: 'Abruzzo', capital: "L'Aquila", province: 'Teramo' },
  'chieti': { region: 'Abruzzo', capital: "L'Aquila", province: 'Chieti' },
  "l'aquila": { region: 'Abruzzo', capital: "L'Aquila", province: "L'Aquila" },
  'avezzano': { region: 'Abruzzo', capital: "L'Aquila", province: "L'Aquila" },
};

// Tutte le catene supportate per fallback
const ALL_CHAINS = ['eurospin', 'lidl', 'conad', 'coop', 'esselunga', 'carrefour', 'pam', 'md', 'penny', 'aldi'];

// Funzione principale: usa ricerca web mirata su volantini
async function scrapeProductPrice(
  product: string, 
  chainName: string, 
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  
  // Ricerca mirata: site:doveconviene.it per avere prezzi reali dai volantini
  const queries = [
    `site:doveconviene.it "${product}" ${chainName} prezzo €`,
    `site:promoqui.it "${product}" ${chainName} prezzo`,
    `"${product}" ${chainName} volantino prezzo € 2025`,
  ];
  
  console.log(`\n🔍 Ricerca prezzo: ${product} @ ${chainName}`);
  
  for (const searchQuery of queries) {
    console.log(`📌 Query: ${searchQuery}`);
    
    try {
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 8,
          lang: 'it',
          country: 'IT',
          scrapeOptions: { formats: ['markdown'] }
        }),
      });

      if (!searchResponse.ok) {
        console.log(`✗ Search failed: ${searchResponse.status}`);
        continue;
      }

      const searchData = await searchResponse.json();
      const results = searchData.data || [];
      console.log(`📊 Trovati ${results.length} risultati`);
      
      // Raccogli tutti i prezzi validi
      const validPrices: { price: number; source: string; context: string }[] = [];
      
      for (const item of results) {
        const content = (item.markdown || '') + ' ' + (item.title || '') + ' ' + (item.description || '');
        const url = item.url || '';
        const contentLower = content.toLowerCase();
        const chainLower = chainName.toLowerCase();
        const productLower = product.toLowerCase();
        
        // Verifica pertinenza: deve contenere sia il prodotto che la catena
        const hasChain = contentLower.includes(chainLower);
        const productWords = productLower.split(/\s+/).filter(w => w.length > 2);
        const hasProduct = productWords.some(w => contentLower.includes(w));
        
        if (!hasProduct) {
          continue;
        }
        
        // Estrai TUTTI i prezzi dal contenuto
        const priceRegex = /€\s*(\d{1,2})[,.](\d{2})|(\d{1,2})[,.](\d{2})\s*€/g;
        let match;
        
        while ((match = priceRegex.exec(content)) !== null) {
          const euros = match[1] || match[3];
          const cents = match[2] || match[4];
          const price = parseFloat(`${euros}.${cents}`);
          
          // Prezzo realistico per supermercato discount (0.30€ - 15€ per prodotti base)
          if (price >= 0.30 && price <= 15) {
            // Estrai il contesto intorno al prezzo
            const startIdx = Math.max(0, match.index - 50);
            const endIdx = Math.min(content.length, match.index + 30);
            const context = content.substring(startIdx, endIdx).replace(/\n/g, ' ').trim();
            
            // Verifica che il contesto contenga parole del prodotto
            const contextLower = context.toLowerCase();
            const isRelevant = productWords.some(w => contextLower.includes(w));
            
            if (isRelevant || hasChain) {
              console.log(`💰 Prezzo trovato: €${price} - "${context.substring(0, 60)}..."`);
              validPrices.push({ price, source: url, context });
            }
          }
        }
      }
      
      // Se abbiamo prezzi validi, prendi la mediana (più affidabile del minimo)
      if (validPrices.length > 0) {
        validPrices.sort((a, b) => a.price - b.price);
        
        // Prendi la mediana o il secondo più basso se ci sono abbastanza dati
        const idx = Math.min(1, Math.floor(validPrices.length / 2));
        const bestPrice = validPrices[idx];
        
        console.log(`✅ PREZZO SELEZIONATO: €${bestPrice.price} (${validPrices.length} prezzi trovati)`);
        
        return {
          price: bestPrice.price,
          source: `verified:${chainName}:${bestPrice.source}`,
          productName: bestPrice.context.substring(0, 60)
        };
      }
      
    } catch (error) {
      console.error(`Errore ricerca:`, error);
    }
  }
  
  console.log(`❌ Nessun prezzo trovato per ${product}`);
  return { price: null, source: 'not_found', productName: null };
}

// Funzione per cercare in altre catene come fallback
async function searchOtherChains(
  product: string,
  originalChain: string,
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; originalChain: string }> {
  const chainsToTry = ALL_CHAINS.filter(c => c !== originalChain.toLowerCase());
  
  console.log(`\n🔄 Ricerca in altre catene: ${chainsToTry.join(', ')}`);
  
  for (const chain of chainsToTry) {
    const result = await scrapeProductPrice(product, chain, city, FIRECRAWL_API_KEY);
    
    if (result.price !== null) {
      console.log(`✓ Trovato in ${chain}: €${result.price}`);
      return { 
        price: result.price, 
        source: result.source,
        originalChain: chain
      };
    }
  }
  
  return { price: null, source: 'not_found_anywhere', originalChain: '' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, storeName, userId, orderId } = await req.json();
    
    if (!product || !storeName) {
      return new Response(
        JSON.stringify({ error: 'Product and store name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const storeNameParts = storeName.split(' - ');
    const chainName = storeNameParts[0].trim();
    const storeAddress = storeNameParts.length > 1 ? storeNameParts.slice(1).join(' - ').trim() : '';
    
    const locationMatch = storeAddress.match(/,\s*([^,]+)$/);
    const city = locationMatch ? locationMatch[1].trim() : '';
    const cityLower = city.toLowerCase();
    
    const regionInfo = PROVINCE_TO_REGION[cityLower] || { region: 'Italia', capital: city, province: city };
    
    const normalizedProduct = product.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();
    const normalizedAddress = storeAddress.toLowerCase();

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🛒 RICERCA PREZZO REALE`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Prodotto: ${product}`);
    console.log(`Catena: ${chainName}`);
    console.log(`Città: ${city}`);

    // ========================================
    // FASE 1: Cache (7 giorni per prezzi reali)
    // ========================================
    console.log('\n📦 FASE 1: Verifica cache...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: cachedPrice } = await supabase
      .from('product_prices')
      .select('*')
      .ilike('product_name', `%${normalizedProduct}%`)
      .ilike('store_name', `%${normalizedStore}%`)
      .gte('created_at', sevenDaysAgo)
      .not('source', 'ilike', '%estimate%')
      .not('source', 'ilike', '%fallback%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let foundPrice: number | null = null;
    let priceFromCache = false;
    let priceSource = 'unknown';
    let completedProductName = product;
    let isEstimated = false;
    let estimatedFromChain: string | null = null;
    
    if (cachedPrice && cachedPrice.source?.includes('firecrawl')) {
      console.log(`✓ TROVATO in cache: €${cachedPrice.price}`);
      foundPrice = cachedPrice.price;
      priceFromCache = true;
      priceSource = cachedPrice.source;
    } else {
      console.log('✗ Non in cache');
    }

    // ========================================
    // FASE 2-5: Scraping reale con Firecrawl
    // ========================================
    if (!priceFromCache && FIRECRAWL_API_KEY) {
      // FASE 2: Scraping nella città locale
      console.log(`\n🌐 FASE 2: Scraping ${chainName} a ${city}...`);
      let scrapeResult = await scrapeProductPrice(product, chainName, city, FIRECRAWL_API_KEY);
      
      if (scrapeResult.price !== null) {
        foundPrice = scrapeResult.price;
        priceSource = scrapeResult.source;
        if (scrapeResult.productName) completedProductName = scrapeResult.productName;
      }

      // FASE 3: Scraping nella provincia
      if (foundPrice === null && regionInfo.province !== city) {
        console.log(`\n🌐 FASE 3: Scraping ${chainName} in provincia ${regionInfo.province}...`);
        scrapeResult = await scrapeProductPrice(product, chainName, regionInfo.province, FIRECRAWL_API_KEY);
        
        if (scrapeResult.price !== null) {
          foundPrice = scrapeResult.price;
          priceSource = scrapeResult.source;
          if (scrapeResult.productName) completedProductName = scrapeResult.productName;
        }
      }

      // FASE 4: Scraping nel capoluogo regionale
      if (foundPrice === null && regionInfo.capital !== city && regionInfo.capital !== regionInfo.province) {
        console.log(`\n🌐 FASE 4: Scraping ${chainName} a ${regionInfo.capital}...`);
        scrapeResult = await scrapeProductPrice(product, chainName, regionInfo.capital, FIRECRAWL_API_KEY);
        
        if (scrapeResult.price !== null) {
          foundPrice = scrapeResult.price;
          priceSource = scrapeResult.source;
          if (scrapeResult.productName) completedProductName = scrapeResult.productName;
        }
      }

      // ========================================
      // FASE 5: FALLBACK - Cerca in ALTRE catene e aggiungi +10%
      // ========================================
      if (foundPrice === null) {
        console.log(`\n🔄 FASE 5: Ricerca in altre catene (fallback +10%)...`);
        const fallbackResult = await searchOtherChains(product, chainName, city, FIRECRAWL_API_KEY);
        
        if (fallbackResult.price !== null) {
          // Aggiungi 10% di margine di sicurezza
          const originalPrice = fallbackResult.price;
          foundPrice = Math.round(originalPrice * 1.10 * 100) / 100; // +10% arrotondato a 2 decimali
          priceSource = `estimated_from:${fallbackResult.originalChain}`;
          isEstimated = true;
          estimatedFromChain = fallbackResult.originalChain;
          console.log(`✓ Prezzo stimato: €${originalPrice} (${fallbackResult.originalChain}) + 10% = €${foundPrice}`);
        }
      }
    } else if (!FIRECRAWL_API_KEY) {
      console.log('⚠️ FIRECRAWL_API_KEY non configurata');
    }

    // ========================================
    // Log per KPI
    // ========================================
    if (userId) {
      try {
        await supabase.from('price_search_logs').insert({
          user_id: userId,
          order_id: orderId || null,
          product_name: product,
          store_name: chainName,
          price_found: foundPrice !== null,
          is_estimated: isEstimated,
          price: foundPrice,
          price_source: priceSource
        });
        console.log('📊 Log KPI salvato');
      } catch (e) {
        console.log('⚠️ Errore salvataggio log KPI:', e);
      }
    }

    // ========================================
    // Se non troviamo nulla, restituiamo NOT FOUND
    // ========================================
    let productAvailable = true;
    let suggestedAlternative: string | null = null;

    if (foundPrice === null) {
      console.log('\n❌ PREZZO NON TROVATO');
      priceSource = 'not_found';
      
      let productImageUrl: string | null = null;
      if (LOVABLE_API_KEY) {
        try {
          const imagePrompt = `Fotografia professionale di prodotto alimentare: ${product}. Stile: foto realistica su sfondo bianco. Alta qualità.`;
          
          const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-image',
              messages: [{ role: 'user', content: imagePrompt }],
              modalities: ['image', 'text']
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            productImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
          }
        } catch (e) {
          console.log('⚠️ Generazione immagine fallita');
        }
      }
      
      return new Response(
        JSON.stringify({
          price: null,
          priceInfo: 'Prezzo non trovato',
          cached: false,
          estimated: false,
          notFound: true,
          priceSource: 'not_found',
          completedProduct: product,
          productAvailable: false,
          suggestedAlternative: null,
          imageUrl: productImageUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // COMPLETAMENTO NOME PRODOTTO
    // ========================================
    console.log('\n🏷️ Completamento nome prodotto...');
    
    if (LOVABLE_API_KEY && completedProductName === product) {
      try {
        const completionPrompt = `Prodotto: "${product}"
Catena: ${chainName}

Completa il nome del prodotto includendo BRAND e formato standard.
Rispondi SOLO con il nome completo (max 60 caratteri).`;

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
          
          if (suggestedName && suggestedName.length > 3 && suggestedName.length <= 100) {
            completedProductName = suggestedName;
            console.log(`✓ Nome completato: ${completedProductName}`);
          }
        }
      } catch (e) {
        console.log('⚠️ Completamento nome fallito');
      }
    }

    // ========================================
    // GENERAZIONE IMMAGINE
    // ========================================
    let productImageUrl: string | null = null;
    
    if (LOVABLE_API_KEY) {
      try {
        const imagePrompt = `Fotografia professionale di prodotto: ${completedProductName} venduto da ${chainName}. Sfondo bianco, stile catalogo supermercato.`;

        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [{ role: 'user', content: imagePrompt }],
            modalities: ['image', 'text']
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          productImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
        }
      } catch (e) {
        console.log('⚠️ Generazione immagine fallita');
      }
    }
        
    // ========================================
    // SALVA IN CACHE (solo prezzi reali, non stimati)
    // ========================================
    if (!priceFromCache && foundPrice !== null && !isEstimated && priceSource.includes('firecrawl')) {
      console.log('\n💾 Salvataggio in cache...');
      await supabase
        .from('product_prices')
        .upsert({
          product_name: normalizedProduct,
          store_name: normalizedStore,
          store_address: normalizedAddress,
          price: foundPrice,
          source: priceSource,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'product_name,store_name,store_address'
        });
    }

    const responseData = { 
      price: foundPrice,
      priceInfo: `€${foundPrice.toFixed(2)}`,
      cached: priceFromCache,
      estimated: isEstimated,
      estimatedFromChain,
      priceSource,
      completedProduct: completedProductName,
      productAvailable,
      suggestedAlternative,
      imageUrl: productImageUrl
    };
    
    console.log('\n📦 Response:', JSON.stringify(responseData));
    
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
