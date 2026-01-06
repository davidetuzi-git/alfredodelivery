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

// URL ufficiali dei volantini per catena
const CHAIN_FLYER_URLS: Record<string, string[]> = {
  'eurospin': [
    'https://www.eurospin.it/volantino/',
    'https://www.doveconviene.it/volantino/eurospin'
  ],
  'lidl': [
    'https://www.lidl.it/offerte',
    'https://www.doveconviene.it/volantino/lidl'
  ],
  'conad': [
    'https://www.conad.it/offerte-e-promozioni.html',
    'https://www.doveconviene.it/volantino/conad'
  ],
  'coop': [
    'https://www.e-coop.it/offerte',
    'https://www.doveconviene.it/volantino/coop'
  ],
  'esselunga': [
    'https://www.esselunga.it/cms/offerte/volantino.html',
    'https://www.doveconviene.it/volantino/esselunga'
  ],
  'carrefour': [
    'https://www.carrefour.it/volantino',
    'https://www.doveconviene.it/volantino/carrefour'
  ],
  'pam': [
    'https://www.pampanorama.it/volantino',
    'https://www.doveconviene.it/volantino/pam'
  ],
  'md': [
    'https://www.mdspa.it/volantino/',
    'https://www.doveconviene.it/volantino/md-discount'
  ],
  'penny': [
    'https://www.penny.it/offerte',
    'https://www.doveconviene.it/volantino/penny-market'
  ],
  'aldi': [
    'https://www.aldi.it/offerte.html',
    'https://www.doveconviene.it/volantino/aldi'
  ],
};

// Funzione per fare scraping DIRETTO dal sito del supermercato
async function scrapeDirectFromChain(
  product: string, 
  chainName: string, 
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  const chainLower = chainName.toLowerCase();
  const flyerUrls = CHAIN_FLYER_URLS[chainLower] || [];
  
  console.log(`\n🎯 SCRAPING DIRETTO: ${chainName}`);
  console.log(`📍 URL volantini: ${flyerUrls.length}`);

  for (const flyerUrl of flyerUrls) {
    console.log(`\n📄 Scraping: ${flyerUrl}`);
    
    try {
      // Usa Firecrawl per fare scraping diretto della pagina del volantino
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: flyerUrl,
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 2000,
        }),
      });

      if (!scrapeResponse.ok) {
        console.log(`✗ Scrape failed: ${scrapeResponse.status}`);
        continue;
      }

      const scrapeData = await scrapeResponse.json();
      const content = scrapeData.data?.markdown || scrapeData.markdown || '';
      
      if (!content) {
        console.log('✗ Nessun contenuto trovato');
        continue;
      }

      console.log(`📊 Contenuto: ${content.length} caratteri`);
      
      // Cerca il prodotto nel contenuto
      const productWords = product.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const contentLower = content.toLowerCase();
      
      // Trova tutte le sezioni che contengono il prodotto
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        const lineOriginal = lines[i];
        
        // Verifica se questa riga contiene parole chiave del prodotto
        const matchedWords = productWords.filter(word => line.includes(word));
        
        if (matchedWords.length >= 1) {
          console.log(`🔍 Riga match: "${lineOriginal.substring(0, 100)}..."`);
          
          // Cerca il prezzo in questa riga e nelle 3 righe successive
          const searchBlock = lines.slice(i, i + 4).join(' ');
          
          const pricePatterns = [
            /€\s*(\d+)[,.](\d{2})/,
            /(\d+)[,.](\d{2})\s*€/,
            /(\d+)[,.](\d{2})/,
          ];

          for (const pattern of pricePatterns) {
            const match = searchBlock.match(pattern);
            if (match) {
              const priceStr = `${match[1]}.${match[2]}`;
              const price = parseFloat(priceStr);
              
              // Prezzo realistico per supermercato (0.20€ - 50€)
              if (price >= 0.20 && price <= 50) {
                console.log(`✅ PREZZO TROVATO: €${price} per "${product}" su ${flyerUrl}`);
                return {
                  price,
                  source: `volantino:${chainName}:${flyerUrl}`,
                  productName: lineOriginal.trim().substring(0, 60)
                };
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`Errore scraping ${flyerUrl}:`, error);
    }
  }
  
  return { price: null, source: 'not_in_flyer', productName: null };
}

// Funzione per cercare su DoveConviene (aggregatore volantini affidabile)
async function searchDoveConviene(
  product: string, 
  chainName: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  // DoveConviene ha una ricerca prodotto specifica
  const searchUrl = `https://www.doveconviene.it/ricerca?q=${encodeURIComponent(product)}+${encodeURIComponent(chainName)}`;
  
  console.log(`\n🔎 Ricerca DoveConviene: ${searchUrl}`);
  
  try {
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!searchResponse.ok) {
      console.log(`✗ DoveConviene search failed: ${searchResponse.status}`);
      return { price: null, source: 'doveconviene_failed', productName: null };
    }

    const searchData = await searchResponse.json();
    const content = searchData.data?.markdown || searchData.markdown || '';
    
    if (!content) {
      return { price: null, source: 'no_content', productName: null };
    }

    console.log(`📊 DoveConviene contenuto: ${content.length} caratteri`);
    
    // Cerca prezzi nel contenuto
    const productLower = product.toLowerCase();
    const chainLower = chainName.toLowerCase();
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Cerca righe che contengono sia il prodotto che la catena
      if (line.includes(productLower.split(' ')[0]) || 
          (line.includes(chainLower) && i > 0 && lines[i-1].toLowerCase().includes(productLower.split(' ')[0]))) {
        
        const searchBlock = lines.slice(Math.max(0, i-2), i + 3).join(' ');
        
        const priceMatch = searchBlock.match(/€\s*(\d+)[,.](\d{2})|(\d+)[,.](\d{2})\s*€/);
        if (priceMatch) {
          const euros = priceMatch[1] || priceMatch[3];
          const cents = priceMatch[2] || priceMatch[4];
          const price = parseFloat(`${euros}.${cents}`);
          
          if (price >= 0.20 && price <= 50) {
            console.log(`✅ DoveConviene PREZZO: €${price}`);
            return {
              price,
              source: `doveconviene:${chainName}`,
              productName: lines[i].trim().substring(0, 60)
            };
          }
        }
      }
    }
    
    return { price: null, source: 'not_found_doveconviene', productName: null };
    
  } catch (error) {
    console.error('Errore DoveConviene:', error);
    return { price: null, source: 'doveconviene_error', productName: null };
  }
}

// Funzione principale di ricerca prezzo (ora con scraping diretto)
async function scrapeProductPrice(
  product: string, 
  chainName: string, 
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  
  // STEP 1: Prova scraping diretto dal volantino ufficiale
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`STEP 1: Volantino ufficiale ${chainName}`);
  let result = await scrapeDirectFromChain(product, chainName, FIRECRAWL_API_KEY);
  if (result.price !== null) return result;
  
  // STEP 2: Prova DoveConviene (aggregatore affidabile)
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`STEP 2: DoveConviene`);
  result = await searchDoveConviene(product, chainName, FIRECRAWL_API_KEY);
  if (result.price !== null) return result;
  
  // STEP 3: Ricerca generica come ultimo tentativo
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`STEP 3: Ricerca web generica`);
  
  const searchQuery = `"${product}" prezzo ${chainName} volantino 2025`;
  
  try {
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: 'it',
        country: 'IT',
        scrapeOptions: { formats: ['markdown'] }
      }),
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      
      if (searchData.data) {
        for (const item of searchData.data) {
          const content = (item.markdown || '') + ' ' + (item.title || '');
          const url = item.url || '';
          
          // Verifica che sia effettivamente del supermercato richiesto
          if (!url.toLowerCase().includes(chainName.toLowerCase()) && 
              !content.toLowerCase().includes(chainName.toLowerCase())) {
            continue;
          }
          
          const priceMatch = content.match(/€\s*(\d+)[,.](\d{2})|(\d+)[,.](\d{2})\s*€/);
          if (priceMatch) {
            const euros = priceMatch[1] || priceMatch[3];
            const cents = priceMatch[2] || priceMatch[4];
            const price = parseFloat(`${euros}.${cents}`);
            
            if (price >= 0.20 && price <= 50) {
              console.log(`✅ Web search PREZZO: €${price} da ${url}`);
              return {
                price,
                source: `web:${chainName}:${url}`,
                productName: null
              };
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Errore ricerca web:', error);
  }
  
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
