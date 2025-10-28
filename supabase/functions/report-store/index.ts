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
    const { storeName, address, city, notes } = await req.json();
    
    if (!storeName || !address || !city) {
      return new Response(
        JSON.stringify({ error: 'Store name, address and city are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (storeName.length > 100 || address.length > 200 || city.length > 100 || (notes && notes.length > 500)) {
      return new Response(
        JSON.stringify({ error: 'Input exceeds maximum length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Store report received:', {
      storeName,
      address,
      city,
      notes: notes || 'N/A'
    });

    // In a real implementation, you would:
    // 1. Save to a database table for store reports
    // 2. Send an email notification to administrators
    // 3. Or integrate with a ticketing system
    
    // For now, we just log it and return success
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Store report received successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in report-store function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
