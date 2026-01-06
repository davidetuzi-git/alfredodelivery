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

// URL siti ufficiali dei supermercati per scraping
const CHAIN_WEBSITES: Record<string, { searchUrl: string; domain: string }> = {
  'eurospin': { 
    searchUrl: 'https://www.eurospin.it/spesa-online/search?q=', 
    domain: 'eurospin.it' 
  },
  'lidl': { 
    searchUrl: 'https://www.lidl.it/q/search?q=', 
    domain: 'lidl.it' 
  },
  'conad': { 
    searchUrl: 'https://spesaonline.conad.it/search?q=', 
    domain: 'conad.it' 
  },
  'coop': { 
    searchUrl: 'https://www.coopshop.it/search?q=', 
    domain: 'coopshop.it' 
  },
  'esselunga': { 
    searchUrl: 'https://www.esselungaacasa.it/ecommerce/nav/search/text/', 
    domain: 'esselungaacasa.it' 
  },
  'carrefour': { 
    searchUrl: 'https://www.carrefour.it/ricerca?q=', 
    domain: 'carrefour.it' 
  },
  'pam': { 
    searchUrl: 'https://www.pampanorama.it/search?q=', 
    domain: 'pampanorama.it' 
  },
  'md': { 
    searchUrl: 'https://www.mdspa.it/volantino/', 
    domain: 'mdspa.it' 
  },
  'penny': { 
    searchUrl: 'https://www.penny.it/offerte', 
    domain: 'penny.it' 
  },
  'aldi': { 
    searchUrl: 'https://www.aldi.it/offerte/', 
    domain: 'aldi.it' 
  },
};

// Funzione per fare scraping con Firecrawl
async function scrapeProductPrice(
  product: string, 
  chainName: string, 
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string; productName: string | null }> {
  const chainLower = chainName.toLowerCase();
  const chainConfig = CHAIN_WEBSITES[chainLower];
  
  if (!chainConfig) {
    console.log(`⚠️ Catena ${chainName} non supportata per scraping diretto`);
    return { price: null, source: 'unsupported_chain', productName: null };
  }

  // Costruisci query di ricerca
  const searchQuery = `${product} prezzo ${chainName} ${city}`;
  
  console.log(`🔍 Firecrawl search: "${searchQuery}"`);

  try {
    // Usa Firecrawl search per cercare prezzi online
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

    if (searchData.data && searchData.data.length > 0) {
      // Analizza i risultati per estrarre prezzi
      for (const result of searchData.data) {
        const content = result.markdown || result.description || '';
        const title = result.title || '';
        
        // Cerca pattern di prezzo nel contenuto
        // Pattern: €X.XX, X,XX €, X.XX€, ecc.
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
            
            // Verifica che sia un prezzo ragionevole (0.10 - 100€ per prodotti alimentari)
            if (price >= 0.10 && price <= 100) {
              console.log(`✓ Prezzo trovato via scraping: €${price} da ${result.url || 'unknown'}`);
              
              // Estrai nome prodotto completo se disponibile
              const productNameMatch = title.match(new RegExp(`(${product}[^€\\d]{0,50})`, 'i'));
              const foundProductName = productNameMatch ? productNameMatch[1].trim() : null;
              
              return { 
                price, 
                source: `firecrawl:${result.url || chainConfig.domain}`,
                productName: foundProductName
              };
            }
          }
        }
      }
    }

    console.log('✗ Nessun prezzo trovato nei risultati scraping');
    return { price: null, source: 'no_price_found', productName: null };

  } catch (error) {
    console.error('Errore Firecrawl:', error);
    return { price: null, source: 'scrape_error', productName: null };
  }
}

// Funzione per scraping del volantino della catena
async function scrapeFlyer(
  product: string,
  chainName: string,
  city: string,
  FIRECRAWL_API_KEY: string
): Promise<{ price: number | null; source: string }> {
  const searchQuery = `volantino ${chainName} ${city} ${product} offerta prezzo`;
  
  console.log(`📰 Ricerca volantino: "${searchQuery}"`);

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
        lang: 'it',
        country: 'IT',
        tbs: 'qdr:w', // Ultima settimana per volantini recenti
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    if (!response.ok) {
      return { price: null, source: 'flyer_search_failed' };
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      for (const result of data.data) {
        const content = (result.markdown || '') + ' ' + (result.title || '');
        
        // Cerca prezzo vicino al nome del prodotto
        const productPattern = new RegExp(`${product}[^€\\d]*€?\\s*(\\d+)[,.](\\d{2})`, 'i');
        const match = content.match(productPattern);
        
        if (match) {
          const price = parseFloat(`${match[1]}.${match[2]}`);
          if (price >= 0.10 && price <= 100) {
            console.log(`✓ Prezzo da volantino: €${price}`);
            return { price, source: `flyer:${result.url || chainName}` };
          }
        }
      }
    }

    return { price: null, source: 'no_flyer_price' };
  } catch (error) {
    console.error('Errore ricerca volantino:', error);
    return { price: null, source: 'flyer_error' };
  }
}

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
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const storeNameParts = storeName.split(' - ');
    const chainName = storeNameParts[0].trim();
    const storeAddress = storeNameParts.length > 1 ? storeNameParts.slice(1).join(' - ').trim() : '';
    
    // Estrai città/provincia dall'indirizzo
    const locationMatch = storeAddress.match(/,\s*([^,]+)$/);
    const city = locationMatch ? locationMatch[1].trim() : '';
    const cityLower = city.toLowerCase();
    
    // Determina la regione e il capoluogo
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
    console.log(`Provincia: ${regionInfo.province}`);
    console.log(`Capoluogo: ${regionInfo.capital}`);

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
      .not('source', 'ilike', '%estimate%') // Escludi stime dalla cache
      .not('source', 'ilike', '%fallback%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let foundPrice: number | null = null;
    let priceFromCache = false;
    let priceSource = 'unknown';
    let completedProductName = product;
    
    if (cachedPrice && cachedPrice.source?.includes('firecrawl')) {
      console.log(`✓ TROVATO in cache (fonte reale): €${cachedPrice.price}`);
      foundPrice = cachedPrice.price;
      priceFromCache = true;
      priceSource = cachedPrice.source;
    } else {
      console.log('✗ Non in cache o solo stime');
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

      // FASE 5: Ricerca volantino
      if (foundPrice === null) {
        console.log(`\n📰 FASE 5: Ricerca volantino ${chainName}...`);
        const flyerResult = await scrapeFlyer(product, chainName, city, FIRECRAWL_API_KEY);
        
        if (flyerResult.price !== null) {
          foundPrice = flyerResult.price;
          priceSource = flyerResult.source;
        }
      }
    } else if (!FIRECRAWL_API_KEY) {
      console.log('⚠️ FIRECRAWL_API_KEY non configurata');
    }

    // ========================================
    // Se non troviamo nulla, restituiamo NOT FOUND
    // ========================================
    let productAvailable = true;
    let suggestedAlternative: string | null = null;

    if (foundPrice === null) {
      console.log('\n❌ PREZZO NON TROVATO - Nessuna stima verrà fornita');
      priceSource = 'not_found';
      
      // Genera immagine prodotto se disponibile API
      let productImageUrl: string | null = null;
      if (LOVABLE_API_KEY) {
        try {
          const imagePrompt = `Fotografia professionale di prodotto alimentare: ${product}. Stile: foto realistica su sfondo bianco, come nei cataloghi di supermercato. Alta qualità, professionale.`;
          
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

Completa il nome del prodotto includendo:
- BRAND (se noto per questa catena)
- Formato/peso standard
- Descrizione chiara

Rispondi SOLO con il nome completo (max 60 caratteri).
Esempio: "Barilla Pasta di Semola Penne 500g"`;

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
        console.log('⚠️ Completamento nome fallito:', e);
      }
    }

    // ========================================
    // GENERAZIONE IMMAGINE
    // ========================================
    console.log('\n📸 Generazione immagine prodotto...');
    let productImageUrl: string | null = null;
    
    if (LOVABLE_API_KEY) {
      try {
        const imagePrompt = `Fotografia professionale di prodotto: ${completedProductName} venduto da ${chainName}.
Stile: foto realistica di prodotto su sfondo bianco, come nei cataloghi di supermercato.
Alta qualità, realistica, professionale.`;

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
        
    // ========================================
    // SALVA IN CACHE (solo prezzi reali da scraping)
    // ========================================
    if (!priceFromCache && foundPrice !== null && priceSource.includes('firecrawl')) {
      console.log('\n💾 Salvataggio in cache...');
      const { error: upsertError } = await supabase
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

      if (upsertError) {
        console.log('⚠️ Cache upsert fallito:', upsertError.message);
      } else {
        console.log('✓ Prezzo salvato in cache');
      }
    }

    const responseData = { 
      price: foundPrice,
      priceInfo: `€${foundPrice.toFixed(2)}`,
      cached: priceFromCache,
      estimated: false, // Mai stimato, sempre da fonte reale
      priceSource,
      completedProduct: completedProductName,
      productAvailable,
      suggestedAlternative,
      imageUrl: productImageUrl
    };
    
    console.log('\n📦 Response finale:', JSON.stringify(responseData));
    
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
