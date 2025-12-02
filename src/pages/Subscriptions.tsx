import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { ArrowLeft, Check, Crown, Sparkles, Clock, Gift, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription, SUBSCRIPTION_PLANS, Subscription } from "@/hooks/useSubscription";
import { addMonths, addYears, format } from "date-fns";
import { it } from "date-fns/locale";

const Subscriptions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, benefits, loading, refreshSubscription } = useSubscription();
  const [purchasing, setPurchasing] = useState<"monthly" | "yearly" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
      }
    });
  }, [navigate]);

  const handlePurchase = async (plan: "monthly" | "yearly") => {
    if (!userId) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua il login per acquistare un abbonamento",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    setPurchasing(plan);

    try {
      const planDetails = SUBSCRIPTION_PLANS[plan];
      const now = new Date();
      const expiresAt = plan === "monthly" ? addMonths(now, 1) : addYears(now, 1);

      const { error } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          plan: plan,
          status: "active",
          deliveries_remaining: planDetails.deliveries,
          deliveries_total: planDetails.deliveries,
          price_paid: planDetails.price,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast({
        title: "Abbonamento attivato! 🎉",
        description: `Il tuo piano ${planDetails.name} è ora attivo.`
      });

      await refreshSubscription();
    } catch (error) {
      console.error("Error purchasing subscription:", error);
      toast({
        title: "Errore",
        description: "Impossibile completare l'acquisto. Riprova.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ 
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", subscription.id);

      if (error) throw error;

      toast({
        title: "Abbonamento cancellato",
        description: "Il tuo abbonamento rimarrà attivo fino alla scadenza."
      });

      await refreshSubscription();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Errore",
        description: "Impossibile cancellare l'abbonamento. Riprova.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Alfredo Extra</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Risparmia su ogni ordine e goditi vantaggi esclusivi con i nostri piani di abbonamento
          </p>
        </div>

        {/* Active Subscription Banner */}
        {subscription && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Il tuo abbonamento</CardTitle>
                </div>
                <Badge variant="default" className="bg-primary">
                  {SUBSCRIPTION_PLANS[subscription.plan].name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{subscription.deliveries_remaining}</div>
                  <div className="text-sm text-muted-foreground">Consegne rimanenti</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">€{benefits.pickingFeePerProduct.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">per prodotto</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {format(new Date(subscription.expires_at), "dd MMM", { locale: it })}
                  </div>
                  <div className="text-sm text-muted-foreground">Scade il</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="flex justify-center">
                    {benefits.hasPriority && <Zap className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="text-sm text-muted-foreground">Priorità attiva</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancella abbonamento
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className={`relative overflow-hidden ${subscription?.plan === "monthly" ? "border-primary" : ""}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Mensile</Badge>
                {subscription?.plan === "monthly" && (
                  <Badge variant="default" className="bg-primary">Attivo</Badge>
                )}
              </div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Piano Base
              </CardTitle>
              <CardDescription>
                Perfetto per chi fa la spesa 1-2 volte a settimana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">€39,90</span>
                <span className="text-muted-foreground">/mese</span>
              </div>
              
              <ul className="space-y-3">
                {SUBSCRIPTION_PLANS.monthly.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handlePurchase("monthly")}
                disabled={purchasing !== null || subscription?.plan === "monthly"}
              >
                {purchasing === "monthly" ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Elaborazione...
                  </span>
                ) : subscription?.plan === "monthly" ? (
                  "Piano attivo"
                ) : (
                  "Abbonati ora"
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Yearly Plan */}
          <Card className={`relative overflow-hidden ${subscription?.plan === "yearly" ? "border-primary" : "border-2 border-primary/50"}`}>
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
              PIÙ POPOLARE
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Annuale</Badge>
                {subscription?.plan === "yearly" && (
                  <Badge variant="default" className="bg-primary">Attivo</Badge>
                )}
              </div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                Piano Plus
              </CardTitle>
              <CardDescription>
                La scelta migliore per clienti premium
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <span className="text-4xl font-bold">€429,90</span>
                <span className="text-muted-foreground">/anno</span>
              </div>
              <div className="mb-6">
                <Badge variant="outline" className="text-primary border-primary">
                  Risparmi €48,90 rispetto al mensile
                </Badge>
              </div>
              
              <ul className="space-y-3">
                {SUBSCRIPTION_PLANS.yearly.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handlePurchase("yearly")}
                disabled={purchasing !== null || subscription?.plan === "yearly"}
              >
                {purchasing === "yearly" ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Elaborazione...
                  </span>
                ) : subscription?.plan === "yearly" ? (
                  "Piano attivo"
                ) : (
                  "Abbonati ora"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Domande frequenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Cosa succede se finisco le consegne?</h4>
              <p className="text-sm text-muted-foreground">
                Potrai continuare a ordinare pagando la tariffa standard per le consegne aggiuntive, mantenendo comunque lo sconto sul product picking.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Posso passare dal piano mensile all'annuale?</h4>
              <p className="text-sm text-muted-foreground">
                Sì, puoi effettuare l'upgrade in qualsiasi momento. Le consegne rimanenti del piano precedente verranno convertite.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Come funziona la priorità negli ordini?</h4>
              <p className="text-sm text-muted-foreground">
                Gli ordini degli abbonati vengono processati prima rispetto agli ordini standard, garantendo slot di consegna migliori.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Subscriptions;
