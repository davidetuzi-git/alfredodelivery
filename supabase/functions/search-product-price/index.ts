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

// Prezzi tipici prodotti base discount (2025, Italia) - DATABASE ESPANSO
const BASIC_PRODUCT_PRICES: Record<string, number> = {
  // Uova
  'uova': 2.29, 'uova 6': 1.49, 'uova 10': 2.49, 'uova 12': 2.99, 'uova fresche': 2.49,
  // Latte
  'latte': 1.29, 'latte intero': 1.35, 'latte parzialmente scremato': 1.29, 'latte scremato': 1.25, 
  'latte fresco': 1.69, 'latte 1l': 1.29, 'latte uht': 1.19,
  // Pane
  'pane': 1.49, 'pane casereccio': 1.99, 'pane integrale': 2.29, 'pancarrè': 1.49, 'pane bianco': 1.49,
  // Pasta
  'pasta': 0.89, 'spaghetti': 0.89, 'penne': 0.89, 'rigatoni': 0.89, 'fusilli': 0.89,
  'pasta barilla': 1.29, 'pasta de cecco': 1.49, 'pasta rummo': 1.69,
  // Riso
  'riso': 1.79, 'riso arborio': 2.49, 'riso carnaroli': 2.99, 'riso basmati': 2.29,
  // Olio
  'olio': 5.99, 'olio extravergine': 6.99, 'olio di oliva': 5.99, 'olio di semi': 2.49, 'olio evo': 6.99,
  // Burro
  'burro': 2.49, 'burro 250g': 2.99, 'burro 125g': 1.79,
  // Zucchero
  'zucchero': 1.29, 'zucchero 1kg': 1.29, 'zucchero di canna': 1.99,
  // Farina
  'farina': 0.99, 'farina 00': 0.99, 'farina 1kg': 1.19, 'farina manitoba': 1.49,
  // Sale
  'sale': 0.49, 'sale fino': 0.49, 'sale grosso': 0.49, 'sale iodato': 0.59,
  // Caffè
  'caffè': 3.49, 'caffè 250g': 2.99, 'caffè moka': 3.49, 'caffè lavazza': 4.99, 'caffè illy': 6.99,
  // Cioccolato
  'cioccolato': 1.49, 'cioccolata': 1.49, 'cioccolato 100g': 1.49, 'nutella': 3.99, 'nutella 400g': 3.99,
  // Acqua
  'acqua': 0.35, 'acqua 1.5l': 0.35, 'acqua 6x1.5l': 1.99, 'acqua minerale': 0.35,
  // Pomodori
  'pomodori pelati': 0.79, 'passata': 0.99, 'passata di pomodoro': 0.99, 'polpa di pomodoro': 0.89,
  // Tonno
  'tonno': 1.99, 'tonno in scatola': 1.99, 'tonno 3x80g': 2.49, 'tonno rio mare': 3.49,
  // Yogurt
  'yogurt': 0.59, 'yogurt greco': 1.49, 'yogurt bianco': 0.99, 'yogurt fage': 1.99,
  // Formaggio
  'mozzarella': 1.49, 'parmigiano': 3.99, 'grana': 3.99, 'formaggio': 2.49, 'grana padano': 3.49,
  'parmigiano reggiano': 4.99, 'pecorino': 3.99, 'ricotta': 1.49, 'philadelphia': 2.49,
  // Frutta
  'mele': 1.99, 'banane': 1.49, 'arance': 1.79, 'pere': 2.29, 'kiwi': 2.99, 'fragole': 2.99,
  'limoni': 1.99, 'uva': 2.49, 'pesche': 2.49, 'albicocche': 2.99,
  // Verdura
  'insalata': 1.29, 'pomodori': 1.99, 'zucchine': 1.79, 'carote': 0.99, 'patate': 1.49,
  'cipolle': 1.29, 'aglio': 0.99, 'peperoni': 2.49, 'melanzane': 1.99, 'spinaci': 1.99,
  // Carne
  'pollo': 5.99, 'petto di pollo': 7.99, 'macinato': 5.49, 'carne macinata': 5.49,
  'salsiccia': 4.99, 'prosciutto': 2.99, 'prosciutto cotto': 2.99, 'prosciutto crudo': 4.99,
  // Bevande
  'coca cola': 1.79, 'coca cola 1.5l': 1.79, 'fanta': 1.49, 'sprite': 1.49, 'birra': 1.29,
  'vino': 3.99, 'succo': 1.49, 'succo di frutta': 1.49, 'the': 1.29,
  // Snack
  'biscotti': 1.99, 'cracker': 1.49, 'patatine': 1.99, 'chips': 1.99, 'merendine': 2.49,
  // Surgelati
  'pizza surgelata': 2.99, 'gelato': 3.99, 'verdure surgelate': 1.99, 'bastoncini findus': 4.99,
  // Altro
  'detersivo': 3.99, 'sapone': 1.99, 'shampoo': 2.99, 'carta igienica': 3.99,
};

// Funzione per trovare prezzo base - VELOCE
function getBasicProductPrice(product: string): number | null {
  const productLower = product.toLowerCase().trim();
  const normalized = productLower
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[,.;:]/g, ' ')
    .replace(/\b(confezione|conf|da|di|n\.?|nr\.?|numero)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Match esatto
  if (BASIC_PRODUCT_PRICES[normalized]) return BASIC_PRODUCT_PRICES[normalized];
  if (BASIC_PRODUCT_PRICES[productLower]) return BASIC_PRODUCT_PRICES[productLower];

  // Caso speciale: uova con quantità
  if (normalized.includes('uova')) {
    const countMatch = normalized.match(/\b(\d{1,2})\b/);
    if (countMatch) {
      const key = `uova ${parseInt(countMatch[1], 10)}`;
      if (BASIC_PRODUCT_PRICES[key]) return BASIC_PRODUCT_PRICES[key];
    }
  }

  // Match parziale - cerca la chiave più lunga che corrisponde
  let bestMatch: { key: string; price: number } | null = null;
  for (const [key, price] of Object.entries(BASIC_PRODUCT_PRICES)) {
    if (normalized.includes(key) || key.includes(normalized) || productLower.includes(key) || key.includes(productLower)) {
      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { key, price };
      }
    }
  }

  return bestMatch?.price || null;
}

// Estrai formato dal nome prodotto (es: 100g, 1L, 6 pz)
function extractFormat(product: string): { format: string | null; unit: string | null } {
  const weightVolumeMatch = product.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|g|gr|ml|cl|l|lt)\b/i);
  if (weightVolumeMatch) {
    const qty = weightVolumeMatch[1].replace(',', '.');
    let unit = weightVolumeMatch[2].toLowerCase();
    if (unit === 'kilo') unit = 'kg';
    if (unit === 'gr') unit = 'g';
    if (unit === 'lt') unit = 'l';
    return { format: `${qty}${unit}`, unit };
  }

  const packMatch =
    product.match(/(?:confezione\s*(?:da|di)?\s*)?(\d{1,2})\s*(pz|pezzi|uova)\b/i) ||
    product.match(/\b(\d{1,2})\s*(pz|pezzi|uova)\b/i) ||
    product.match(/\b(?:x|×)\s*(\d{1,2})\b/i) ||
    product.match(/\b(\d{1,2})\s*(?:x|×)\b/i);

  if (packMatch) {
    const count = parseInt(packMatch[1], 10);
    if (!isNaN(count) && count > 1 && count <= 48) {
      return { format: `${count} pz`, unit: 'pz' };
    }
  }

  return { format: null, unit: null };
}

// Ricerca web mirata - OTTIMIZZATA con timeout
async function scrapeProductPrice(
  product: string, 
  chainName: string, 
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  
  const productFormat = extractFormat(product);
  
  // UNA SOLA query ottimizzata
  const searchQuery = `site:doveconviene.it "${product}" ${chainName} prezzo`;
  
  console.log(`🔍 Ricerca: ${product} @ ${chainName}`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 sec timeout
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5, // Ridotto da 8
        lang: 'it',
        country: 'IT',
        scrapeOptions: { formats: ['markdown'] }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!searchResponse.ok) {
      console.log(`✗ Search failed: ${searchResponse.status}`);
      return { price: null, source: 'not_found', productName: null };
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || [];
    
    const validPrices: { price: number; source: string; context: string }[] = [];
    const productWords = product.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    for (const item of results) {
      const content = (item.markdown || '') + ' ' + (item.title || '') + ' ' + (item.description || '');
      const url = item.url || '';
      const contentLower = content.toLowerCase();
      const urlLower = url.toLowerCase();
      
      // Filtro siti esteri
      const foreignDomains = ['.ch', '.de', '.fr', '.at', '.es', '.uk'];
      if (foreignDomains.some(d => urlLower.includes(d))) continue;
      if (!urlLower.includes('.it')) continue;
      
      // Verifica pertinenza
      const hasProduct = productWords.some(w => contentLower.includes(w));
      if (!hasProduct) continue;
      
      // Estrai prezzi
      const priceRegex = /€\s*(\d{1,2})[,.](\d{2})|(\d{1,2})[,.](\d{2})\s*€/g;
      let match;
      
      while ((match = priceRegex.exec(content)) !== null) {
        const euros = match[1] || match[3];
        const cents = match[2] || match[4];
        const price = parseFloat(`${euros}.${cents}`);
        
        if (price >= 0.30 && price <= 15) {
          const startIdx = Math.max(0, match.index - 50);
          const endIdx = Math.min(content.length, match.index + 30);
          const context = content.substring(startIdx, endIdx).replace(/\n/g, ' ').trim();
          
          const contextLower = context.toLowerCase();
          const isRelevant = productWords.some(w => contextLower.includes(w));
          
          let formatMatch = true;
          if (productFormat.format) {
            const contextFormat = extractFormat(context);
            if (contextFormat.format && productFormat.unit !== contextFormat.unit) {
              formatMatch = false;
            }
          }
          
          if (isRelevant && formatMatch) {
            validPrices.push({ price, source: url, context });
          }
        }
      }
    }
    
    if (validPrices.length > 0) {
      validPrices.sort((a, b) => a.price - b.price);
      const idx = Math.min(1, Math.floor(validPrices.length / 2));
      const bestPrice = validPrices[idx];
      
      console.log(`✅ €${bestPrice.price}`);
      
      return {
        price: bestPrice.price,
        source: `verified:${chainName}:firecrawl`,
        productName: bestPrice.context.substring(0, 60)
      };
    }
    
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⏱️ Timeout ricerca');
    } else {
      console.error('Errore:', error);
    }
  }
  
  return { price: null, source: 'not_found', productName: null };
}

// Stima AI rapida
async function estimatePriceWithAI(
  product: string,
  chainName: string,
  LOVABLE_API_KEY: string
): Promise<{ price: number | null; confidence: string }> {
  console.log(`🤖 Stima AI: ${product}...`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4 sec timeout
    
    const prompt = `Prezzo ${product} in ${chainName} (Italia 2025). Rispondi SOLO con JSON: {"price": X.XX, "confidence": "alta|media|bassa"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 60,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      return { price: null, confidence: 'none' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { price: null, confidence: 'none' };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const price = parseFloat(parsed.price);
    
    if (price >= 0.20 && price <= 25) {
      console.log(`✓ AI: €${price}`);
      return { price, confidence: parsed.confidence || 'media' };
    }
    
  } catch (error: unknown) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      console.error('AI error:', error);
    }
  }
  
  return { price: null, confidence: 'none' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, storeName, userId, orderId, format } = await req.json();
    
    if (!product || !storeName) {
      return new Response(
        JSON.stringify({ error: 'Product and store name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productWithFormat = format ? `${product} ${format}` : product;

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
    
    const normalizedProduct = productWithFormat.trim().toLowerCase();
    const normalizedStore = chainName.toLowerCase();

    console.log(`\n🛒 ${product} @ ${chainName}`);

    // ========================================
    // FASE 0: PRODOTTI BASE (ISTANTANEO)
    // ========================================
    const basicPrice = getBasicProductPrice(productWithFormat);
    if (basicPrice !== null) {
      console.log(`⚡ Prezzo base: €${basicPrice}`);
      
      // Log async (non blocca)
      if (userId) {
        supabase.from('price_search_logs').insert({
          user_id: userId,
          order_id: orderId || null,
          product_name: product,
          store_name: chainName,
          price_found: true,
          is_estimated: true,
          price: basicPrice,
          price_source: 'basic_product'
        }).then(() => {});
      }
      
      return new Response(
        JSON.stringify({
          price: basicPrice,
          priceInfo: `€${basicPrice.toFixed(2)}`,
          cached: false,
          estimated: true,
          priceSource: 'basic_product',
          completedProduct: product,
          productAvailable: true,
          suggestedAlternative: null,
          imageUrl: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // FASE 1: CACHE (query parallele)
    // ========================================
    console.log('📦 Cache...');
    const cacheDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Query cache parallele
    const [sameStoreCache, anyStoreCache] = await Promise.all([
      supabase
        .from('product_prices')
        .select('*')
        .ilike('product_name', `%${normalizedProduct}%`)
        .ilike('store_name', `%${normalizedStore}%`)
        .gte('created_at', cacheDate)
        .not('source', 'ilike', '%estimate%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('product_prices')
        .select('*')
        .ilike('product_name', `%${normalizedProduct}%`)
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .not('source', 'ilike', '%estimate%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    let foundPrice: number | null = null;
    let priceFromCache = false;
    let priceSource = 'unknown';
    let isEstimated = false;

    // Check same store cache
    const sameCachePrice = sameStoreCache.data?.price;
    if (sameCachePrice && sameCachePrice >= 0.2 && sameCachePrice <= 20) {
      console.log(`✓ Cache stessa catena: €${sameCachePrice}`);
      foundPrice = sameCachePrice;
      priceFromCache = true;
      priceSource = sameStoreCache.data?.source || 'cache';
    } 
    // Check any store cache
    else {
      const anyCachePrice = anyStoreCache.data?.price;
      if (anyCachePrice && anyCachePrice >= 0.2 && anyCachePrice <= 20) {
        console.log(`✓ Cache crowd: €${anyCachePrice}`);
        foundPrice = anyCachePrice;
        priceFromCache = true;
        priceSource = `crowd_cache:${anyStoreCache.data?.store_name}`;
      }
    }

    // ========================================
    // FASE 2: SCRAPING (solo 1 tentativo)
    // ========================================
    if (!priceFromCache && FIRECRAWL_API_KEY) {
      console.log('🌐 Scraping...');
      const scrapeResult = await scrapeProductPrice(productWithFormat, chainName, city, FIRECRAWL_API_KEY);
      
      if (scrapeResult.price !== null) {
        foundPrice = scrapeResult.price;
        priceSource = scrapeResult.source;
        
        // Salva in cache async
        supabase.from('product_prices').upsert({
          product_name: normalizedProduct,
          store_name: normalizedStore,
          store_address: storeAddress.toLowerCase(),
          price: foundPrice,
          source: priceSource,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'product_name,store_name,store_address'
        }).then(() => {});
      }
    }

    // ========================================
    // FASE 3: AI ESTIMATE (fallback veloce)
    // ========================================
    if (foundPrice === null && LOVABLE_API_KEY) {
      const aiResult = await estimatePriceWithAI(product, chainName, LOVABLE_API_KEY);
      
      if (aiResult.price !== null) {
        foundPrice = aiResult.price;
        priceSource = 'ai_estimate';
        isEstimated = true;
      }
    }

    // ========================================
    // FASE 4: FALLBACK GENERICO
    // ========================================
    if (foundPrice === null) {
      // Stima generica basata su categoria
      const genericEstimates: Record<string, number> = {
        'carne': 6.99, 'pesce': 8.99, 'formaggi': 3.99,
        'frutta': 2.49, 'verdura': 1.99, 'bevande': 1.99,
        'snack': 2.49, 'dolci': 2.99, 'surgelati': 3.99,
      };
      
      for (const [category, price] of Object.entries(genericEstimates)) {
        if (normalizedProduct.includes(category)) {
          foundPrice = price;
          priceSource = 'category_estimate';
          isEstimated = true;
          break;
        }
      }
      
      // Ultimo fallback
      if (foundPrice === null) {
        foundPrice = 2.99;
        priceSource = 'generic_estimate';
        isEstimated = true;
      }
    }

    // Log KPI async
    if (userId) {
      supabase.from('price_search_logs').insert({
        user_id: userId,
        order_id: orderId || null,
        product_name: product,
        store_name: chainName,
        price_found: true,
        is_estimated: isEstimated,
        price: foundPrice,
        price_source: priceSource
      }).then(() => {});
    }

    console.log(`📦 ${product}: €${foundPrice} (${priceSource})`);
    
    return new Response(
      JSON.stringify({
        price: foundPrice,
        priceInfo: isEstimated ? `~€${foundPrice.toFixed(2)}` : `€${foundPrice.toFixed(2)}`,
        cached: priceFromCache,
        estimated: isEstimated,
        priceSource,
        completedProduct: product,
        productAvailable: true,
        suggestedAlternative: null,
        imageUrl: null
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
