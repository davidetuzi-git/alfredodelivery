import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, storeName } = await req.json();
    console.log('Estimating prices for items:', items, 'at store:', storeName);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Filter items that need price estimation
    const itemsNeedingEstimation = items.filter((item: any) => 
      item.name && item.name.trim() && (item.price === null || item.price === undefined)
    );

    if (itemsNeedingEstimation.length === 0) {
      return new Response(
        JSON.stringify({ estimatedItems: items }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare prompt for AI
    const itemsList = itemsNeedingEstimation.map((item: any) => 
      `- ${item.name} (quantità: ${item.quantity})`
    ).join('\n');

    const prompt = `Sei un esperto di prezzi dei supermercati italiani. Devi stimare i prezzi per i seguenti prodotti da ${storeName}.

IMPORTANTE: Devi fare stime CONSERVATIVE (leggermente più alte del reale) per proteggere il cliente da sorprese.

Prodotti da stimare:
${itemsList}

Per ogni prodotto, rispondi SOLO con un oggetto JSON valido in questo formato:
{
  "estimates": [
    {
      "productName": "nome esatto del prodotto",
      "estimatedPrice": prezzo_stimato_in_euro,
      "confidence": "high|medium|low",
      "reasoning": "breve spiegazione della stima"
    }
  ]
}

Regole per le stime:
1. Prezzi realistici per il mercato italiano
2. Leggermente più alti del prezzo medio (stima conservativa)
3. Considera il tipo di supermercato (discount vs premium)
4. Se il prodotto è generico, stima il prezzo medio-alto della categoria
5. NON includere testo prima o dopo il JSON`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit raggiunto, riprova tra poco" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Errore nella chiamata AI");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error("Risposta AI vuota");
    }

    console.log("AI response:", aiContent);

    // Parse AI response
    let estimates;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        estimates = JSON.parse(jsonMatch[0]);
      } else {
        estimates = JSON.parse(aiContent);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e, aiContent);
      throw new Error("Formato risposta AI non valido");
    }

    // Merge estimates back into items
    const estimatedItems = items.map((item: any) => {
      if (item.price !== null && item.price !== undefined) {
        return item;
      }

      const estimate = estimates.estimates?.find((e: any) => 
        e.productName.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(e.productName.toLowerCase())
      );

      if (estimate) {
        return {
          ...item,
          price: estimate.estimatedPrice,
          isEstimated: true,
          estimateConfidence: estimate.confidence,
          estimateReasoning: estimate.reasoning
        };
      }

      // Fallback to a conservative default if AI didn't provide estimate
      return {
        ...item,
        price: 5.00, // Conservative fallback
        isEstimated: true,
        estimateConfidence: 'low',
        estimateReasoning: 'Stima conservativa di default'
      };
    });

    console.log("Estimated items:", estimatedItems);

    return new Response(
      JSON.stringify({ estimatedItems }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in estimate-missing-prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
