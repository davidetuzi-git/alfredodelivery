import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { toast } from "sonner";

const DelivererAutoLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleAutoLogin = async () => {
      try {
        // Check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Already logged in, just redirect
          navigate('/deliverer-dashboard');
          return;
        }

        // Get token from URL
        const token = searchParams.get('token');
        if (!token) {
          setStatus("error");
          toast.error("Token mancante");
          setTimeout(() => navigate('/deliverer-auth'), 2000);
          return;
        }

        // Verify token and get user info
        const { data: tokenData, error: tokenError } = await supabase
          .from('deliverer_auth_tokens')
          .select('deliverer_id, deliverers!inner(user_id, email, name)')
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .single();

        if (tokenError || !tokenData || !tokenData.deliverers) {
          setStatus("error");
          toast.error("Token non valido o scaduto");
          setTimeout(() => navigate('/deliverer-auth'), 2000);
          return;
        }

        // Mark token as used
        await supabase
          .from('deliverer_auth_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', token);

        const deliverer = Array.isArray(tokenData.deliverers) 
          ? tokenData.deliverers[0] 
          : tokenData.deliverers;

        if (!deliverer?.user_id || !deliverer?.email) {
          setStatus("error");
          toast.error("Profilo deliverer non configurato");
          setTimeout(() => navigate('/deliverer-auth'), 2000);
          return;
        }

        // Call the server function to create a session
        const { data, error } = await supabase.functions.invoke('create-deliverer-session', {
          body: { user_id: deliverer.user_id }
        });

        if (error) {
          console.error("Error creating session:", error);
          setStatus("error");
          toast.error("Errore nell'autenticazione automatica");
          setTimeout(() => navigate('/deliverer-auth'), 2000);
          return;
        }

        if (data?.access_token && data?.refresh_token) {
          // Set the session using the tokens from the server
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

          if (sessionError) {
            console.error("Error setting session:", sessionError);
            setStatus("error");
            toast.error("Errore nel login automatico");
            setTimeout(() => navigate('/deliverer-auth'), 2000);
            return;
          }

          setStatus("success");
          toast.success("Accesso effettuato!");
          setTimeout(() => navigate('/deliverer-dashboard'), 500);
        } else {
          setStatus("error");
          toast.error("Sessione non valida");
          setTimeout(() => navigate('/deliverer-auth'), 2000);
        }
      } catch (error) {
        console.error("Auto-login error:", error);
        setStatus("error");
        toast.error("Errore imprevisto");
        setTimeout(() => navigate('/deliverer-auth'), 2000);
      }
    };

    handleAutoLogin();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Truck className={`h-12 w-12 text-primary mx-auto ${status === "loading" ? "animate-bounce" : ""}`} />
            {status === "loading" && <p className="text-lg">Autenticazione in corso...</p>}
            {status === "success" && <p className="text-lg text-green-600">Accesso effettuato! Reindirizzamento...</p>}
            {status === "error" && <p className="text-lg text-red-600">Errore nell'autenticazione. Reindirizzamento...</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelivererAutoLogin;
