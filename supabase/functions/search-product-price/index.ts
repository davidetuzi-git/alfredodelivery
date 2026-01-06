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

// Range di prezzo realistico per categoria prodotto (min, max)
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  // Panificazione
  'pane': { min: 0.50, max: 3.50 },
  'baguette': { min: 0.50, max: 2.50 },
  'focaccia': { min: 1.00, max: 4.00 },
  'panino': { min: 0.30, max: 2.00 },
  'grissini': { min: 0.80, max: 3.00 },
  // Latticini
  'latte': { min: 0.80, max: 3.00 },
  'yogurt': { min: 0.30, max: 2.50 },
  'burro': { min: 1.50, max: 5.00 },
  'formaggio': { min: 1.00, max: 15.00 },
  'mozzarella': { min: 0.80, max: 5.00 },
  'parmigiano': { min: 3.00, max: 25.00 },
  // Frutta e verdura
  'mela': { min: 0.50, max: 4.00 },
  'banana': { min: 0.80, max: 2.50 },
  'insalata': { min: 0.80, max: 3.00 },
  'pomodoro': { min: 0.80, max: 4.00 },
  'patate': { min: 0.80, max: 3.00 },
  // Pasta e riso
  'pasta': { min: 0.50, max: 4.00 },
  'spaghetti': { min: 0.50, max: 3.00 },
  'riso': { min: 1.00, max: 5.00 },
  // Bevande
  'acqua': { min: 0.20, max: 1.50 },
  'coca cola': { min: 1.00, max: 3.00 },
  'birra': { min: 0.60, max: 3.00 },
  'vino': { min: 2.00, max: 20.00 },
  'succo': { min: 0.80, max: 3.00 },
  // Carne
  'pollo': { min: 3.00, max: 12.00 },
  'manzo': { min: 5.00, max: 25.00 },
  'maiale': { min: 4.00, max: 15.00 },
  'prosciutto': { min: 1.50, max: 8.00 },
  'salame': { min: 1.50, max: 6.00 },
  // Uova
  'uova': { min: 1.50, max: 5.00 },
  // Surgelati
  'gelato': { min: 1.50, max: 6.00 },
  'pizza': { min: 1.50, max: 5.00 },
  // Default generico
  'default': { min: 0.30, max: 50.00 },
};

// Funzione per ottenere il range di prezzo appropriato
function getPriceRange(productName: string): { min: number; max: number } {
  const productLower = productName.toLowerCase();
  
  for (const [keyword, range] of Object.entries(PRICE_RANGES)) {
    if (keyword !== 'default' && productLower.includes(keyword)) {
      return range;
    }
  }
  
  return PRICE_RANGES['default'];
}

// Funzione per fare scraping con Firecrawl
async function scrapeProductPrice(
  product: string, 
  chainName: string, 
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  const searchQuery = `${product} prezzo ${chainName} volantino offerta`;
  
  console.log(`🔍 Firecrawl search: "${searchQuery}"`);

  // Ottieni il range di prezzo realistico per questo prodotto
  const priceRange = getPriceRange(product);
  console.log(`📊 Range prezzo atteso: €${priceRange.min} - €${priceRange.max}`);

  try {
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        lang: 'it',
        country: 'IT',
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    if (!searchResponse.ok) {
      console.log(`✗ Firecrawl search failed: ${searchResponse.status}`);
      return { price: null, source: 'search_failed', productName: null };
    }

    const searchData = await searchResponse.json();
    console.log(`📊 Firecrawl trovati ${searchData.data?.length || 0} risultati`);

    // Collezioniamo tutti i prezzi validi trovati
    const validPrices: { price: number; source: string; productName: string | null }[] = [];

    if (searchData.data && searchData.data.length > 0) {
      for (const result of searchData.data) {
        const content = result.markdown || result.description || '';
        const title = result.title || '';
        const url = result.url || '';
        
        // Verifica che il risultato sia pertinente (contenga il nome del prodotto o simile)
        const productWords = product.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const contentLower = (content + ' ' + title).toLowerCase();
        const isRelevant = productWords.some(word => contentLower.includes(word));
        
        if (!isRelevant) {
          console.log(`⏭️ Risultato non pertinente: ${title.substring(0, 50)}`);
          continue;
        }
        
        const pricePatterns = [
          /€\s*(\d+)[,.](\d{2})/g,
          /(\d+)[,.](\d{2})\s*€/g,
          /prezzo[:\s]*€?\s*(\d+)[,.](\d{2})/gi,
          /(\d+)[,.](\d{2})\s*euro/gi,
        ];

        for (const pattern of pricePatterns) {
          const matches = [...content.matchAll(pattern), ...title.matchAll(pattern)];
          
          for (const match of matches) {
            const priceStr = `${match[1]}.${match[2]}`;
            const price = parseFloat(priceStr);
            
            // Usa il range di prezzo realistico per categoria
            if (price >= priceRange.min && price <= priceRange.max) {
              console.log(`✓ Prezzo valido: €${price} (range: €${priceRange.min}-€${priceRange.max})`);
              
              const productNameMatch = title.match(new RegExp(`(${product.split(' ')[0]}[^€\\d]{0,50})`, 'i'));
              const foundProductName = productNameMatch ? productNameMatch[1].trim() : null;
              
              validPrices.push({ 
                price, 
                source: `firecrawl:${chainName}:${url}`,
                productName: foundProductName
              });
            } else {
              console.log(`⏭️ Prezzo fuori range: €${price} (atteso: €${priceRange.min}-€${priceRange.max})`);
            }
          }
        }
      }
    }

    // Restituisci il prezzo più basso tra quelli validi (più realistico per discount)
    if (validPrices.length > 0) {
      validPrices.sort((a, b) => a.price - b.price);
      const bestPrice = validPrices[0];
      console.log(`✓ Miglior prezzo trovato: €${bestPrice.price}`);
      return bestPrice;
    }

    return { price: null, source: 'no_price_found', productName: null };

  } catch (error) {
    console.error('Errore Firecrawl:', error);
    return { price: null, source: 'scrape_error', productName: null };
  }
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
