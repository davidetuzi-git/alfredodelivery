import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Genera immagine prodotto con timeout (max 15 secondi per stare nei 20s richiesti dall'utente)
async function generateProductImage(productName: string, storeName: string, LOVABLE_API_KEY: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondi timeout
    
    // Prompt ottimizzato per prodotto specifico + brand/catena
    const prompt = `Ultra realistic product photography of exactly: ${productName}. 
Product as sold in Italian supermarket ${storeName}. 
Professional studio shot with perfect lighting, white background, centered, highly detailed, 
photorealistic, commercial quality, sharp focus, true-to-life colors, exact product representation.
Show the actual product packaging/brand if known.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Image generation failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      console.log(`✓ Image generated for "${productName}"`);
      return imageUrl;
    }
    
    return null;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError') {
      console.log(`Image generation timeout for "${productName}"`);
    } else {
      console.log(`Image generation error: ${err.message || 'Unknown'}`);
    }
    return null;
  }
}

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

// Catene discount che NON vendono marchi nazionali
const DISCOUNT_CHAINS = ['eurospin', 'lidl', 'md', 'aldi', 'penny', 'todis', 'prix'];

// Marchi nazionali/internazionali che i discount NON vendono
const BRANDED_PRODUCTS: Record<string, { alternative: string; altPrice: number }> = {
  'nutella': { alternative: 'Crema spalmabile alle nocciole (marca discount)', altPrice: 2.49 },
  'barilla': { alternative: 'Pasta marca discount', altPrice: 0.69 },
  'de cecco': { alternative: 'Pasta marca discount', altPrice: 0.69 },
  'rummo': { alternative: 'Pasta marca discount', altPrice: 0.69 },
  'mulino bianco': { alternative: 'Biscotti marca discount', altPrice: 1.49 },
  'ferrero': { alternative: 'Cioccolato marca discount', altPrice: 1.99 },
  'kinder': { alternative: 'Snack cioccolato marca discount', altPrice: 1.49 },
  'coca cola': { alternative: 'Cola marca discount', altPrice: 0.79 },
  'fanta': { alternative: 'Aranciata marca discount', altPrice: 0.59 },
  'sprite': { alternative: 'Limonata marca discount', altPrice: 0.59 },
  'pepsi': { alternative: 'Cola marca discount', altPrice: 0.79 },
  'rio mare': { alternative: 'Tonno marca discount', altPrice: 1.49 },
  'lavazza': { alternative: 'Caffè marca discount', altPrice: 2.99 },
  'illy': { alternative: 'Caffè marca discount', altPrice: 2.99 },
  'findus': { alternative: 'Surgelati marca discount', altPrice: 2.49 },
  'algida': { alternative: 'Gelato marca discount', altPrice: 2.99 },
  'magnum': { alternative: 'Gelato stecco marca discount', altPrice: 1.99 },
  'philadelphia': { alternative: 'Formaggio spalmabile marca discount', altPrice: 1.49 },
  'pringles': { alternative: 'Patatine marca discount', altPrice: 1.29 },
  'galbani': { alternative: 'Formaggio marca discount', altPrice: 2.49 },
  'fage': { alternative: 'Yogurt greco marca discount', altPrice: 0.99 },
  'müller': { alternative: 'Yogurt marca discount', altPrice: 0.49 },
  'activia': { alternative: 'Yogurt marca discount', altPrice: 0.49 },
  'danone': { alternative: 'Yogurt marca discount', altPrice: 0.49 },
  'scottex': { alternative: 'Carta igienica marca discount', altPrice: 2.49 },
  'regina': { alternative: 'Carta casa marca discount', altPrice: 1.99 },
};

// Funzione per verificare se un prodotto di marca è cercato in un discount
function checkBrandAvailability(product: string, storeName: string): { available: boolean; alternative: string | null; altPrice: number | null } {
  const productLower = product.toLowerCase();
  const storeLower = storeName.toLowerCase();
  
  // Verifica se è un discount
  const isDiscount = DISCOUNT_CHAINS.some(chain => storeLower.includes(chain));
  if (!isDiscount) {
    return { available: true, alternative: null, altPrice: null };
  }
  
  // Verifica se il prodotto contiene un marchio noto
  for (const [brand, info] of Object.entries(BRANDED_PRODUCTS)) {
    if (productLower.includes(brand)) {
      return { 
        available: false, 
        alternative: info.alternative,
        altPrice: info.altPrice
      };
    }
  }
  
  return { available: true, alternative: null, altPrice: null };
}

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


// Prodotti che richiedono formato specifico con il loro formato più piccolo
const PRODUCTS_REQUIRING_FORMAT: Record<string, string> = {
  'nutella': '200g',
  'coca cola': '500ml',
  'fanta': '500ml',
  'sprite': '500ml',
  'pepsi': '500ml',
  'acqua': '500ml',
  'latte': '500ml',
  'olio': '500ml',
  'passata': '500g',
  'yogurt': '125g',
  'mozzarella': '125g',
  'philadelphia': '150g',
  'ketchup': '250g',
  'maionese': '225g',
  'marmellata': '250g',
  'miele': '250g',
  'pesto': '190g',
  'tonno': '80g',
  'pasta': '500g',
  'riso': '500g',
  'farina': '1kg',
  'zucchero': '1kg',
  'cereali': '375g',
  'biscotti': '350g',
  'patatine': '130g',
  'cioccolato': '100g',
  'gelato': '300g',
  'birra': '330ml',
  'vino': '750ml',
  'succo': '1L',
  'the': '1.5L',
  'detersivo': '1L',
  'shampoo': '250ml',
  'bagnoschiuma': '500ml',
};

// Aggiunge automaticamente il formato più piccolo se necessario
function autoAddFormat(product: string, existingFormat: string | null): { product: string; format: string | null; autoAdded: boolean } {
  if (existingFormat) {
    return { product, format: existingFormat, autoAdded: false };
  }
  
  const productLower = product.toLowerCase().trim();
  
  // Controlla se ha già un formato nel nome
  const hasFormat = /\d+\s*(g|kg|ml|cl|l|lt|gr)\b/i.test(product);
  if (hasFormat) {
    const extracted = extractFormat(product);
    return { product, format: extracted.format, autoAdded: false };
  }
  
  // Cerca corrispondenza con prodotti che richiedono formato
  for (const [keyword, defaultFormat] of Object.entries(PRODUCTS_REQUIRING_FORMAT)) {
    if (productLower.includes(keyword)) {
      console.log(`📦 Auto-formato: "${product}" → ${defaultFormat}`);
      return { product, format: defaultFormat, autoAdded: true };
    }
  }
  
  return { product, format: null, autoAdded: false };
}

// Ricerca AI prezzi con gerarchia geografica
async function searchPriceWithAI(
  product: string,
  chainName: string,
  city: string,
  LOVABLE_API_KEY: string
): Promise<{ price: number | null; confidence: string; source: string }> {
  console.log(`🔍 Ricerca AI: ${product} @ ${chainName} (${city || 'Italia'})...`);
  
  // Determina contesto geografico
  const cityLower = city.toLowerCase().trim();
  const geoInfo = PROVINCE_TO_REGION[cityLower];
  const province = geoInfo?.province || city || '';
  const region = geoInfo?.region || '';
  const capital = geoInfo?.capital || '';
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 sec timeout per ricerca più approfondita
    
    // Prompt strutturato per ricerca reale con gerarchia geografica
    const prompt = `Sei un esperto di prezzi dei supermercati italiani. Devi trovare il prezzo REALE di un prodotto.

PRODOTTO: ${product}
CATENA: ${chainName}
${city ? `CITTÀ: ${city}` : ''}
${province ? `PROVINCIA: ${province}` : ''}
${region ? `REGIONE: ${region}` : ''}

ISTRUZIONI DI RICERCA (segui questa gerarchia):
1. PRIMA cerca il prezzo specifico per ${chainName} ${city ? `a ${city}` : 'in Italia'}
2. Se non trovi, cerca il prezzo per ${chainName} ${province ? `nella provincia di ${province}` : ''}
3. Se non trovi, cerca il prezzo per ${chainName} ${region ? `in ${region}` : ''}
4. Se non trovi, cerca il prezzo medio nazionale per ${chainName}
5. ULTIMO FALLBACK: prezzo medio italiano in supermercati simili

IMPORTANTE:
- Considera i prezzi 2024-2025
- ${chainName.toLowerCase().includes('eurospin') || chainName.toLowerCase().includes('lidl') || chainName.toLowerCase().includes('md') || chainName.toLowerCase().includes('aldi') ? 'Questa è una catena DISCOUNT, i prezzi sono generalmente più bassi del 15-25% rispetto ai supermercati tradizionali' : ''}
- Considera eventuali differenze regionali (Nord Italia generalmente +5-10%, Sud -5-10%)

Rispondi SOLO con questo JSON:
{
  "price": X.XX,
  "confidence": "alta|media|bassa",
  "source": "dove hai trovato il prezzo (es: volantino, sito ufficiale, confronto prezzi, stima regionale)"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',  // Modello più potente per ricerca
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`⚠️ AI response not ok: ${response.status}`);
      return { price: null, confidence: 'none', source: 'error' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`⚠️ No JSON in AI response`);
      return { price: null, confidence: 'none', source: 'parse_error' };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const price = parseFloat(parsed.price);
    
    if (price >= 0.10 && price <= 50) {
      console.log(`✓ AI trovato: €${price} (${parsed.confidence}) - ${parsed.source}`);
      return { 
        price, 
        confidence: parsed.confidence || 'media',
        source: parsed.source || 'ai_search'
      };
    }
    
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⚠️ AI search timeout');
    } else {
      console.error('AI search error:', error);
    }
  }
  
  return { price: null, confidence: 'none', source: 'failed' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, storeName, userId, orderId, format: inputFormat } = await req.json();
    
    if (!product || !storeName) {
      return new Response(
        JSON.stringify({ error: 'Product and store name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-aggiungi formato se necessario
    const formatResult = autoAddFormat(product, inputFormat);
    const productWithFormat = formatResult.format ? `${product} ${formatResult.format}` : product;
    const autoFormatAdded = formatResult.autoAdded;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
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
    // FASE 0A: CHECK DISPONIBILITÀ MARCA IN DISCOUNT
    // ========================================
    const brandCheck = checkBrandAvailability(product, chainName);
    if (!brandCheck.available) {
      console.log(`⚠️ Prodotto di marca non disponibile in ${chainName}. Alternativa: ${brandCheck.alternative}`);
      
      // Log async
      if (userId) {
        supabase.from('price_search_logs').insert({
          user_id: userId,
          order_id: orderId || null,
          product_name: product,
          store_name: chainName,
          price_found: false,
          is_estimated: true,
          price: brandCheck.altPrice,
          price_source: 'brand_not_available'
        }).then(() => {});
      }
      
      return new Response(
        JSON.stringify({
          price: brandCheck.altPrice,
          priceInfo: `~€${brandCheck.altPrice?.toFixed(2)} (alternativa)`,
          cached: false,
          estimated: true,
          priceSource: 'brand_alternative',
          completedProduct: brandCheck.alternative,
          productAvailable: false,
          suggestedAlternative: brandCheck.alternative,
          imageUrl: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // FASE 0B: PRODOTTI BASE (ISTANTANEO)
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
    
    // Query cache parallele (FAST PATH)
    // Nota: usiamo match esatto + prefix match (niente %...% iniziale) per evitare query lente.
    const [sameStoreCache, anyStoreCache] = await Promise.all([
      // 1) stessa catena: match esatto sul normalizzato
      supabase
        .from('product_prices')
        .select('*')
        .eq('product_name', normalizedProduct)
        .eq('store_name', normalizedStore)
        .gte('created_at', cacheDate)
        .not('source', 'ilike', '%estimate%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // 2) crowd cache: stesso prodotto (match esatto), qualsiasi store recente
      supabase
        .from('product_prices')
        .select('*')
        .eq('product_name', normalizedProduct)
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .not('source', 'ilike', '%estimate%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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
    // FASE 2: RICERCA AI + IMMAGINE IN PARALLELO
    // ========================================
    let imagePromise: Promise<string | null> = Promise.resolve(null);
    
    // Avvia la generazione immagine in parallelo (se abbiamo API key)
    if (LOVABLE_API_KEY) {
      imagePromise = generateProductImage(product, chainName, LOVABLE_API_KEY);
    }

    if (foundPrice === null && LOVABLE_API_KEY) {
      const aiResult = await searchPriceWithAI(product, chainName, city, LOVABLE_API_KEY);
      
      if (aiResult.price !== null) {
        foundPrice = aiResult.price;
        priceSource = `ai_search:${aiResult.source}`;
        isEstimated = aiResult.confidence !== 'alta';
      }
    }

    // ========================================
    // FASE 3: FALLBACK GENERICO
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

    // Attendi immagine (max 15 sec già gestito nel timeout)
    const imageUrl = await imagePromise;

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

    console.log(`📦 ${product}: €${foundPrice} (${priceSource})${imageUrl ? ' [con immagine]' : ''}`);
    
    return new Response(
      JSON.stringify({
        price: foundPrice,
        priceInfo: isEstimated ? `~€${foundPrice.toFixed(2)}` : `€${foundPrice.toFixed(2)}`,
        cached: priceFromCache,
        estimated: isEstimated,
        priceSource,
        completedProduct: autoFormatAdded ? `${product} ${formatResult.format}` : product,
        autoFormat: autoFormatAdded ? formatResult.format : null,
        productAvailable: true,
        suggestedAlternative: null,
        imageUrl: imageUrl
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
