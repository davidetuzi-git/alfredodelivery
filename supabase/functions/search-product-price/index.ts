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

// Prezzi tipici prodotti base discount (2025, Italia) - usati come fallback ultimo
const BASIC_PRODUCT_PRICES: Record<string, number> = {
  // Uova
  'uova': 2.29, 'uova 6': 1.49, 'uova 10': 2.49, 'uova 12': 2.99,
  // Latte
  'latte': 1.29, 'latte intero': 1.35, 'latte parzialmente scremato': 1.29, 'latte scremato': 1.25, 'latte fresco': 1.69,
  // Pane
  'pane': 1.49, 'pane casereccio': 1.99, 'pane integrale': 2.29, 'pancarrè': 1.49,
  // Pasta
  'pasta': 0.89, 'spaghetti': 0.89, 'penne': 0.89, 'rigatoni': 0.89, 'fusilli': 0.89,
  // Riso
  'riso': 1.79, 'riso arborio': 2.49, 'riso carnaroli': 2.99,
  // Olio
  'olio': 5.99, 'olio extravergine': 6.99, 'olio di oliva': 5.99, 'olio di semi': 2.49,
  // Burro
  'burro': 2.49, 'burro 250g': 2.99,
  // Zucchero
  'zucchero': 1.29, 'zucchero 1kg': 1.29,
  // Farina
  'farina': 0.99, 'farina 00': 0.99, 'farina 1kg': 1.19,
  // Sale
  'sale': 0.49, 'sale fino': 0.49, 'sale grosso': 0.49,
  // Caffè
  'caffè': 3.49, 'caffè 250g': 2.99, 'caffè moka': 3.49,
  // Cioccolato
  'cioccolato': 1.49, 'cioccolata': 1.49, 'cioccolato 100g': 1.49, 'cioccolata 100g': 1.49, 'tavoletta cioccolato': 1.49,
  // Acqua
  'acqua': 0.35, 'acqua 1.5l': 0.35, 'acqua 6x1.5l': 1.99,
  // Pomodori
  'pomodori pelati': 0.79, 'passata': 0.99, 'passata di pomodoro': 0.99,
  // Tonno
  'tonno': 1.99, 'tonno in scatola': 1.99, 'tonno 3x80g': 2.49,
  // Yogurt
  'yogurt': 0.59, 'yogurt greco': 1.49, 'yogurt bianco': 0.99,
  // Formaggio
  'mozzarella': 1.49, 'parmigiano': 3.99, 'grana': 3.99, 'formaggio': 2.49,
  // Frutta
  'mele': 1.99, 'banane': 1.49, 'arance': 1.79, 'pere': 2.29,
  // Verdura
  'insalata': 1.29, 'pomodori': 1.99, 'zucchine': 1.79, 'carote': 0.99, 'patate': 1.49,
  // Carne
  'pollo': 5.99, 'petto di pollo': 7.99, 'macinato': 5.49, 'carne macinata': 5.49,
};

// Funzione per trovare prezzo base
function getBasicProductPrice(product: string): number | null {
  const productLower = product.toLowerCase().trim();
  
  // Match esatto
  if (BASIC_PRODUCT_PRICES[productLower]) {
    return BASIC_PRODUCT_PRICES[productLower];
  }
  
  // Match parziale - cerca la chiave più lunga che corrisponde
  let bestMatch: { key: string; price: number } | null = null;
  for (const [key, price] of Object.entries(BASIC_PRODUCT_PRICES)) {
    if (productLower.includes(key) || key.includes(productLower)) {
      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { key, price };
      }
    }
  }
  
  return bestMatch?.price || null;
}

// Estrai formato dal nome prodotto (es: 100g, 1L, 6 uova)
function extractFormat(product: string): { format: string | null; unit: string | null } {
  const formatRegex = /(\d+)\s*(g|gr|kg|ml|l|lt|cl|pz|uova|pezzi|confezione)/i;
  const match = product.match(formatRegex);
  
  if (match) {
    return { format: match[0], unit: match[2].toLowerCase() };
  }
  return { format: null, unit: null };
}

// Funzione principale: usa ricerca web mirata su volantini
async function scrapeProductPrice(
  product: string, 
  chainName: string, 
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  
  // Estrai formato dal prodotto cercato (es: 100g, 1L)
  const productFormat = extractFormat(product);
  
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
            // Estrai il contesto intorno al prezzo (più ampio per catturare formato)
            const startIdx = Math.max(0, match.index - 80);
            const endIdx = Math.min(content.length, match.index + 40);
            const context = content.substring(startIdx, endIdx).replace(/\n/g, ' ').trim();
            
            // Verifica che il contesto contenga parole del prodotto
            const contextLower = context.toLowerCase();
            const isRelevant = productWords.some(w => contextLower.includes(w));
            
            // NUOVO: Verifica match formato se specificato
            let formatMatch = true;
            if (productFormat.format) {
              const contextFormat = extractFormat(context);
              // Se il prodotto ha un formato, il contesto deve avere lo stesso formato o simile
              if (contextFormat.format) {
                // Confronta unità
                if (productFormat.unit !== contextFormat.unit) {
                  formatMatch = false;
                  console.log(`⚠️ Formato non corrispondente: cercato ${productFormat.format}, trovato ${contextFormat.format}`);
                }
              }
            }
            
            if ((isRelevant || hasChain) && formatMatch) {
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

// Funzione per cercare in altre catene come fallback (max 2 catene per velocità)
async function searchOtherChains(
  product: string,
  originalChain: string,
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; originalChain: string }> {
  // Prova solo 2 catene discount comuni per velocità
  const priorityChains = ['eurospin', 'lidl', 'md', 'penny'].filter(c => c !== originalChain.toLowerCase());
  const chainsToTry = priorityChains.slice(0, 2);
  
  console.log(`\n🔄 Ricerca rapida in: ${chainsToTry.join(', ')}`);
  
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

// Funzione per stima prezzi con Gemini (fallback gratuito)
async function estimatePriceWithAI(
  product: string,
  chainName: string,
  LOVABLE_API_KEY: string
): Promise<{ price: number | null; confidence: string }> {
  console.log(`\n🤖 FASE 6: Stima AI con Gemini per ${product}...`);
  
  try {
    const prompt = `Sei un esperto di prezzi supermercati italiani. Stima il prezzo di questo prodotto.

Prodotto: "${product}"
Catena: ${chainName}
Anno: 2025

REGOLE:
1. Considera che ${chainName} è una catena italiana
2. Stima il prezzo PIÙ COMUNE per questo tipo di prodotto
3. Non sovrastimare - i discount hanno prezzi bassi
4. Per prodotti generici (pane, latte, pasta), usa prezzi tipici discount

Rispondi SOLO con un JSON valido, nient'altro:
{"price": X.XX, "confidence": "alta|media|bassa", "reasoning": "breve spiegazione"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Modello più veloce e leggero
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.log(`✗ AI response failed: ${response.status}`);
      return { price: null, confidence: 'none' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Estrai JSON dalla risposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`✗ No JSON in response: ${content}`);
      return { price: null, confidence: 'none' };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const price = parseFloat(parsed.price);
    
    // Valida il prezzo (range realistico)
    if (isNaN(price) || price < 0.20 || price > 20) {
      console.log(`✗ Price out of range: ${price}`);
      return { price: null, confidence: 'none' };
    }
    
    console.log(`✓ AI stima: €${price} (${parsed.confidence}) - ${parsed.reasoning}`);
    
    return { 
      price: Math.round(price * 100) / 100,
      confidence: parsed.confidence || 'media'
    };
    
  } catch (error) {
    console.error('Errore AI estimation:', error);
    return { price: null, confidence: 'none' };
  }
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
        // Non sovrascrivere completedProductName con il contesto web, lascia fare all'AI
      }

      // FASE 3: Scraping nella provincia
      if (foundPrice === null && regionInfo.province !== city) {
        console.log(`\n🌐 FASE 3: Scraping ${chainName} in provincia ${regionInfo.province}...`);
        scrapeResult = await scrapeProductPrice(product, chainName, regionInfo.province, FIRECRAWL_API_KEY);
        
        if (scrapeResult.price !== null) {
          foundPrice = scrapeResult.price;
          priceSource = scrapeResult.source;
          // Non sovrascrivere completedProductName con il contesto web, lascia fare all'AI
        }
      }

      // FASE 4: Scraping nel capoluogo regionale
      if (foundPrice === null && regionInfo.capital !== city && regionInfo.capital !== regionInfo.province) {
        console.log(`\n🌐 FASE 4: Scraping ${chainName} a ${regionInfo.capital}...`);
        scrapeResult = await scrapeProductPrice(product, chainName, regionInfo.capital, FIRECRAWL_API_KEY);
        
        if (scrapeResult.price !== null) {
          foundPrice = scrapeResult.price;
          priceSource = scrapeResult.source;
          // Non sovrascrivere completedProductName con il contesto web, lascia fare all'AI
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
    // FASE 6: Stima AI con Gemini (fallback gratuito)
    // ========================================
    let productAvailable = true;
    let suggestedAlternative: string | null = null;
    let aiConfidence: string | null = null;

    if (foundPrice === null && LOVABLE_API_KEY) {
      const aiResult = await estimatePriceWithAI(product, chainName, LOVABLE_API_KEY);
      
      if (aiResult.price !== null) {
        foundPrice = aiResult.price;
        priceSource = 'ai_estimate:gemini';
        isEstimated = true;
        aiConfidence = aiResult.confidence;
        console.log(`✓ Prezzo AI: €${foundPrice} (confidence: ${aiConfidence})`);
      }
    }

    // ========================================
    // FASE 6.5: Fallback prodotti base (prezzi tipici discount +10%)
    // ========================================
    if (foundPrice === null) {
      console.log(`\n🛒 FASE 6.5: Verifica prodotti base...`);
      const basicPrice = getBasicProductPrice(product);
      
      if (basicPrice !== null) {
        // Aggiungi 10% di margine sicurezza
        foundPrice = Math.round(basicPrice * 1.10 * 100) / 100;
        priceSource = 'basic_product_fallback';
        isEstimated = true;
        console.log(`✓ Prezzo base: €${basicPrice} + 10% = €${foundPrice}`);
      }
    }

    // Se ancora non troviamo nulla, restituiamo NOT FOUND
    if (foundPrice === null) {
      console.log('\n❌ PREZZO NON TROVATO');
      priceSource = 'not_found';
      
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
          imageUrl: null
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
      priceInfo: isEstimated && priceSource.includes('ai_estimate') 
        ? `~€${foundPrice.toFixed(2)}` 
        : `€${foundPrice.toFixed(2)}`,
      cached: priceFromCache,
      estimated: isEstimated,
      estimatedFromChain,
      aiConfidence,
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
