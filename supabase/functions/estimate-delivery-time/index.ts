import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { delivererId, customerLatitude, customerLongitude } = await req.json();

    if (!delivererId || !customerLatitude || !customerLongitude) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get deliverer position
    const { data: delivererData, error: delivererError } = await supabase
      .from('deliverers')
      .select('latitude, longitude, name')
      .eq('id', delivererId)
      .single();

    if (delivererError || !delivererData) {
      return new Response(
        JSON.stringify({ error: 'Deliverer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!delivererData.latitude || !delivererData.longitude) {
      return new Response(
        JSON.stringify({ error: 'Deliverer position not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const lat1 = delivererData.latitude * Math.PI / 180;
    const lat2 = customerLatitude * Math.PI / 180;
    const dLat = (customerLatitude - delivererData.latitude) * Math.PI / 180;
    const dLon = (customerLongitude - delivererData.longitude) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km

    // Estimate delivery time based on distance
    // Average speed in urban areas: 25 km/h (considering traffic)
    const averageSpeed = 25;
    const baseTimeMinutes = (distance / averageSpeed) * 60;

    // Use Lovable AI to get a more accurate estimate considering traffic patterns
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let estimatedMinutes = baseTimeMinutes;
    let trafficCondition = 'normale';

    if (LOVABLE_API_KEY) {
      try {
        const currentHour = new Date().getHours();
        const prompt = `Considerando una distanza di ${distance.toFixed(2)} km in area urbana, l'ora attuale (${currentHour}:00), stima il tempo di consegna in minuti. Considera traffico tipico italiano. Rispondi solo con il numero di minuti stimato.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: 'Sei un esperto di logistica e traffico urbano italiano. Fornisci stime accurate di tempo di consegna.' 
              },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiEstimate = parseInt(aiData.choices[0]?.message?.content || '');
          if (!isNaN(aiEstimate) && aiEstimate > 0) {
            estimatedMinutes = aiEstimate;
            
            // Determine traffic condition based on AI estimate vs base time
            if (aiEstimate > baseTimeMinutes * 1.3) {
              trafficCondition = 'intenso';
            } else if (aiEstimate > baseTimeMinutes * 1.1) {
              trafficCondition = 'moderato';
            } else {
              trafficCondition = 'scorrevole';
            }
          }
        }
      } catch (error) {
        console.error('Error getting AI estimate:', error);
        // Fallback to base calculation
      }
    }

    // Add 5 minutes buffer for final delivery
    estimatedMinutes += 5;

    return new Response(
      JSON.stringify({
        distance: parseFloat(distance.toFixed(2)),
        estimatedMinutes: Math.round(estimatedMinutes),
        trafficCondition,
        delivererPosition: {
          latitude: delivererData.latitude,
          longitude: delivererData.longitude
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});