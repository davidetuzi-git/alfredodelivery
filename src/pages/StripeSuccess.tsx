import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

const StripeSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const { decrementDelivery } = useSubscription();

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

        // Get pending order data from sessionStorage
        const pendingOrderStr = sessionStorage.getItem('pendingOrder');
        if (!pendingOrderStr) {
          throw new Error("Dati ordine non trovati");
        }

        const pendingOrder = JSON.parse(pendingOrderStr);
        const orderData = pendingOrder.orderData;

        if (!orderData) {
          throw new Error("Dati ordine incompleti");
        }

        // Generate pickup code
        const { data: codeData, error: codeError } = await supabase.rpc('generate_pickup_code');
        if (codeError) throw codeError;

        const pickupCode = codeData;

        // Save order
        const { data: orderInserted, error: insertError } = await supabase.from('orders').insert({
          pickup_code: pickupCode,
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

        // Clear pending order
        sessionStorage.removeItem('pendingOrder');

        setStatus('success');
        
        toast({
          title: "Pagamento completato!",
          description: "Il tuo ordine è stato confermato",
        });

        // Redirect to tracking after delay
        setTimeout(() => {
          navigate("/tracking", { state: { pickupCode } });
        }, 2000);

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
          <CardTitle>
            {status === 'processing' && "Elaborazione pagamento..."}
            {status === 'success' && "Pagamento completato!"}
            {status === 'error' && "Errore pagamento"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'processing' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                Stiamo elaborando il tuo pagamento...
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-muted-foreground text-center">
                Il tuo ordine è stato confermato. Verrai reindirizzato alla pagina di tracking.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
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
