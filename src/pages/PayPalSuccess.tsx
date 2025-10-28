import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PayPalSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  
  useEffect(() => {
    const processPayment = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        toast({
          title: "Errore",
          description: "Token PayPal mancante",
          variant: "destructive",
        });
        setTimeout(() => navigate('/checkout'), 2000);
        return;
      }

      try {
        // Retrieve pending order data
        const orderDataStr = sessionStorage.getItem('pendingOrder');
        if (!orderDataStr) {
          throw new Error('Dati ordine non trovati');
        }
        const orderData = JSON.parse(orderDataStr);

        // Capture PayPal payment
        const { data: captureData, error: captureError } = await supabase.functions.invoke('capture-paypal-order', {
          body: { orderId: token }
        });

        if (captureError) throw captureError;

        // Generate pickup code
        const { data: codeData, error: codeError } = await supabase.rpc('generate_pickup_code');
        if (codeError) throw codeError;
        const pickupCode = codeData;

        // Save order
        const { error: insertError } = await supabase.from('orders').insert({
          pickup_code: pickupCode,
          customer_name: orderData.orderData.name,
          customer_phone: orderData.orderData.phone,
          delivery_address: orderData.orderData.address,
          store_name: orderData.orderData.store,
          delivery_date: orderData.orderData.deliveryDate,
          time_slot: orderData.orderData.timeSlot,
          items: orderData.orderData.items,
          total_amount: orderData.total,
          delivery_fee: orderData.deliveryFee,
          discount: orderData.discount,
          payment_method: 'paypal',
          status: 'confirmed'
        });

        if (insertError) throw insertError;

        // Clear session storage
        sessionStorage.removeItem('pendingOrder');

        setStatus('success');
        toast({
          title: "Pagamento completato!",
          description: "Ordine confermato con successo",
        });

        setTimeout(() => {
          navigate("/tracking", { state: { pickupCode } });
        }, 2000);
      } catch (error) {
        console.error('Payment processing error:', error);
        setStatus('error');
        toast({
          title: "Errore",
          description: "Impossibile completare l'ordine. Riprova.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/checkout'), 2000);
      }
    };

    processPayment();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === 'processing' && (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <h2 className="text-2xl font-bold">Elaborazione pagamento...</h2>
                <p className="text-muted-foreground">
                  Attendere mentre confermiamo il tuo pagamento PayPal
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600" />
                <h2 className="text-2xl font-bold">Pagamento completato!</h2>
                <p className="text-muted-foreground">
                  Il tuo ordine è stato confermato con successo
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-bold">Errore nel pagamento</h2>
                <p className="text-muted-foreground">
                  Si è verificato un errore. Verrai reindirizzato al checkout.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayPalSuccess;
