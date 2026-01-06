import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Ticket, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

const StripeSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { decrementDelivery } = useSubscription();

  const copyCode = () => {
    if (pickupCode) {
      navigator.clipboard.writeText(pickupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const processPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
          throw new Error("Session ID mancante");
        }

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Sessione scaduta",
            description: "Effettua nuovamente l'accesso",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        // Get pending order data from localStorage with retry logic
        // Sometimes localStorage needs a moment to be available after redirect
        let pendingOrderStr: string | null = null;
        for (let i = 0; i < 5; i++) {
          pendingOrderStr = localStorage.getItem('pendingOrder');
          if (pendingOrderStr) break;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!pendingOrderStr) {
          throw new Error("Dati ordine non trovati. Il pagamento è stato completato ma l'ordine non è stato salvato. Contatta l'assistenza.");
        }

        const pendingOrder = JSON.parse(pendingOrderStr);
        const orderData = pendingOrder.orderData;

        if (!orderData) {
          throw new Error("Dati ordine incompleti");
        }

        // Generate pickup code
        const { data: codeData, error: codeError } = await supabase.rpc('generate_pickup_code');
        if (codeError) throw codeError;

        const generatedCode = codeData;
        setPickupCode(generatedCode);

        // Save order
        const { data: orderInserted, error: insertError } = await supabase.from('orders').insert({
          pickup_code: generatedCode,
          user_id: session.user.id,
          customer_name: orderData.name,
          customer_phone: orderData.phone,
          delivery_address: orderData.address,
          store_name: orderData.store,
          delivery_date: orderData.deliveryDate,
          time_slot: orderData.timeSlot,
          items: orderData.items,
          total_amount: pendingOrder.total,
          delivery_fee: pendingOrder.deliveryFee,
          discount: pendingOrder.discount,
          payment_method: 'card',
          status: 'confirmed',
          latitude: orderData.latitude,
          longitude: orderData.longitude
        }).select().single();

        if (insertError) throw insertError;

        // If subscription delivery was used, decrement the count
        if (orderData.subscription?.usedDelivery) {
          await decrementDelivery();
        }

        // Notify deliverers
        if (orderInserted) {
          supabase.functions.invoke('notify-deliverers', {
            body: { order_id: orderInserted.id }
          }).then(({ error }) => {
            if (error) console.error('Error notifying deliverers:', error);
          });
        }

        // Clear pending order from localStorage
        localStorage.removeItem('pendingOrder');

        setStatus('success');
        
        toast({
          title: "Pagamento completato!",
          description: "Il tuo ordine è stato confermato",
        });

        // Redirect to tracking after 3 seconds to show confirmation
        setTimeout(() => {
          navigate("/tracking", { state: { pickupCode: generatedCode } });
        }, 3000);

      } catch (error) {
        console.error('Error processing payment:', error);
        setStatus('error');
        toast({
          title: "Errore",
          description: error instanceof Error ? error.message : "Errore durante il completamento dell'ordine",
          variant: "destructive",
        });
        
        setTimeout(() => {
          navigate("/checkout");
        }, 3000);
      }
    };

    processPayment();
  }, [navigate, searchParams, decrementDelivery]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === 'processing' && "Elaborazione pagamento..."}
            {status === 'success' && "Ordine Confermato!"}
            {status === 'error' && "Errore pagamento"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {status === 'processing' && (
            <>
              <Loader2 className="h-20 w-20 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                Stiamo elaborando il tuo pagamento...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-green-500" />
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Pagamento completato con successo!
                </p>
                <p className="text-muted-foreground">
                  Il tuo ordine è stato confermato e sarà elaborato a breve.
                </p>
              </div>

              {pickupCode && (
                <Card className="w-full border-2 border-primary bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Ticket className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Codice Ritiro
                      </span>
                    </div>
                    <p className="text-4xl font-bold tracking-wider text-center text-primary mb-4">
                      {pickupCode}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={copyCode}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiato!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copia codice
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <p className="text-sm text-muted-foreground text-center animate-pulse">
                Reindirizzamento alla pagina di tracking...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-20 w-20 text-destructive" />
              <p className="text-muted-foreground text-center">
                Si è verificato un errore. Verrai reindirizzato al checkout.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StripeSuccess;
