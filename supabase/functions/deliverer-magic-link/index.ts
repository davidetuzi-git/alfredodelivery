import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const authToken = url.searchParams.get("token");

    if (!authToken) {
      throw new Error("Missing token parameter");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify token and get deliverer info
    const { data: tokenData, error: tokenError } = await supabase
      .from("deliverer_auth_tokens")
      .select("deliverer_id, deliverers!inner(user_id, email, name)")
      .eq("token", authToken)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single();

    if (tokenError || !tokenData || !tokenData.deliverers) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Token non valido</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f6f9fc;
              }
              .container {
                background: white;
                padding: 48px;
                border-radius: 16px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #ef4444; font-size: 48px; margin: 0 0 24px 0; }
              p { color: #666; font-size: 18px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌</h1>
              <h2>Token non valido o scaduto</h2>
              <p>Il link di autenticazione non è più valido. Richiedi un nuovo link.</p>
            </div>
          </body>
        </html>
        `,
        { status: 400, headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }

    // Mark token as used
    await supabase
      .from("deliverer_auth_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", authToken);

    const deliverer = Array.isArray(tokenData.deliverers) ? tokenData.deliverers[0] : tokenData.deliverers;
    
    if (!deliverer || !deliverer.user_id) {
      return new Response(
        JSON.stringify({ error: "Deliverer account not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate an access token for this user
    const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(
      deliverer.user_id
    );

    if (getUserError || !user) {
      console.error("Error getting user:", getUserError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate session for the user
    const baseUrl = Deno.env.get("SUPABASE_URL")!.replace('.supabase.co', '.lovableproject.com');
    const redirectTo = `${baseUrl}/deliverer-dashboard`;
    
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: redirectTo,
      }
    });

    if (sessionError) {
      console.error("Error generating magic link:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to generate session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Magic link generated, redirecting to:", redirectTo);

    // Redirect to the magic link which will authenticate the user
    const redirectUrl = sessionData.properties.action_link;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });
  } catch (error: any) {
    console.error("Error in deliverer-magic-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
