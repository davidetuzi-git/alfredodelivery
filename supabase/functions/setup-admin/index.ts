import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Crea l'utente admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'alfredo@admin.com',
      password: 'ALFREDO',
      email_confirm: true,
      user_metadata: {
        name: 'ALFREDO Admin'
      }
    });

    if (authError) {
      console.error('Error creating admin user:', authError);
      throw authError;
    }

    console.log('Admin user created:', authData.user.id);

    // Assegna il ruolo admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error assigning admin role:', roleError);
      throw roleError;
    }

    console.log('Admin role assigned successfully');

    // Crea anche alcuni fattorini di esempio
    const { error: deliverersError } = await supabaseAdmin
      .from('deliverers')
      .insert([
        {
          name: 'Mario Rossi',
          phone: '+39 333 1234567',
          status: 'available',
          max_orders: 3
        },
        {
          name: 'Luca Bianchi',
          phone: '+39 333 7654321',
          status: 'available',
          max_orders: 3
        }
      ]);

    if (deliverersError) {
      console.log('Note: Could not create sample deliverers (may already exist)');
    } else {
      console.log('Sample deliverers created');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin user created successfully! You can now login with: alfredo@admin.com / ALFREDO',
        userId: authData.user.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'If user already exists, you can use the existing credentials'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});