import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addMonths, addYears } from "date-fns";

const SUBSCRIPTION_PLANS = {
  monthly: {
    name: "Base",
    price: 39.90,
    deliveries: 5,
  },
  yearly: {
    name: "Plus",
    price: 429.90,
    deliveries: 50,
  },
};

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    const activateSubscription = async () => {
      try {
        const sessionId = searchParams.get("session_id");
        const plan = searchParams.get("plan") as "monthly" | "yearly";

        if (!sessionId || !plan) {
          throw new Error("Parametri mancanti");
        }

        // Check user authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          navigate("/auth");
          return;
        }

        // Check if subscription already exists for this session (prevent duplicates)
        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (existingSub) {
          // Already has active subscription, just redirect
          setStatus("success");
          toast({
            title: "Abbonamento già attivo",
            description: "Il tuo abbonamento è già attivo.",
          });
          setTimeout(() => navigate("/abbonamenti"), 2000);
          return;
        }

        // Activate subscription
        const planDetails = SUBSCRIPTION_PLANS[plan];
        const now = new Date();
        const expiresAt = plan === "monthly" ? addMonths(now, 1) : addYears(now, 1);

        const { error: insertError } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: user.id,
            plan: plan,
            status: "active",
            deliveries_remaining: planDetails.deliveries,
            deliveries_total: planDetails.deliveries,
            price_paid: planDetails.price,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (insertError) throw insertError;

        setStatus("success");
        toast({
          title: "Abbonamento attivato! 🎉",
          description: `Il tuo piano ${planDetails.name} è ora attivo.`,
        });

        setTimeout(() => navigate("/abbonamenti"), 3000);
      } catch (error) {
        console.error("Error activating subscription:", error);
        setStatus("error");
        toast({
          title: "Errore",
          description: "Impossibile attivare l'abbonamento. Contatta l'assistenza.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/abbonamenti"), 3000);
      }
    };

    activateSubscription();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          {status === "processing" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Attivazione in corso...</h2>
              <p className="text-muted-foreground">
                Stiamo attivando il tuo abbonamento Alfredo Extra
              </p>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="relative mx-auto w-fit mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Crown className="h-6 w-6 text-primary absolute -top-1 -right-1" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-green-600">
                Abbonamento attivato!
              </h2>
              <p className="text-muted-foreground">
                Benvenuto in Alfredo Extra! Ora puoi goderti tutti i vantaggi esclusivi.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Reindirizzamento in corso...
              </p>
            </>
          )}
          
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-red-600">
                Errore di attivazione
              </h2>
              <p className="text-muted-foreground">
                Si è verificato un problema. Contatta l'assistenza con il riferimento del pagamento.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
