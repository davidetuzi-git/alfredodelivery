import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { CreditCard, Wallet, Receipt, ArrowLeft, Loader2, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Session } from "@supabase/supabase-js";
import { useSubscription } from "@/hooks/useSubscription";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processing, setProcessing] = useState(false);
  const { decrementDelivery } = useSubscription();
  
  
  // Recupera dati da location.state O da localStorage (per il caso di ritorno dal 3D Secure)
  const getOrderData = () => {
    if (location.state && Object.keys(location.state).length > 0) {
      return location.state;
    }
    // Fallback: recupera da localStorage se esiste
    const pendingOrderStr = localStorage.getItem('pendingOrder');
    if (pendingOrderStr) {
      try {
        return JSON.parse(pendingOrderStr);
      } catch {
        return {};
      }
    }
    return {};
  };
  
  const orderData = getOrderData();
  const subtotal = orderData.subtotal || 0;
  const deliveryFee = orderData.deliveryFee || 3.99;
  const discount = orderData.discount || 0;
  const supplements = orderData.supplements || { bagFee: 0, waterFee: 0, waterOnlyFee: 0, holidayFee: 0, total: 0 };
  const serviceFee = orderData.serviceFee || 0;
  const schedulingAdjustment = orderData.schedulingAdjustment || { amount: 0, description: '' };
  const subscriptionData = orderData.orderData?.subscription || null;
  const itemCount = orderData.itemCount || 0;
  const finalTotal = orderData.total || 0;

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Autenticazione richiesta",
          description: "Devi effettuare l'accesso per completare l'ordine",
          variant: "destructive",
        });
        navigate("/auth", { state: { returnTo: "/checkout" } });
        return;
      }
      
      setSession(session);
      setAuthLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth", { state: { returnTo: "/checkout" } });
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleBackToOrder = () => {
    navigate("/ordina", { 
      state: { 
        orderFormData: orderData.orderFormData 
      } 
    });
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Errore",
        description: "Seleziona un metodo di pagamento",
        variant: "destructive",
      });
      return;
    }

    if (!orderData.orderData) {
      toast({
        title: "Errore",
        description: "Dati ordine mancanti",
        variant: "destructive",
      });
      return;
    }

    // If card payment, create Stripe checkout session
    if (paymentMethod === 'card') {
      setProcessing(true);
      try {
        const returnUrl = `${window.location.origin}/stripe-success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}/checkout`;
        
        // Strip imageUrl from items to reduce payload size
        const lightOrderData = {
          ...orderData.orderData,
          items: (orderData.orderData.items || []).map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            suggestion: item.suggestion
          })),
          itemCount,
          subscription: subscriptionData
        };
        
        console.log('Creating Stripe checkout session...');
        
        const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
          body: { 
            amount: finalTotal,
            orderData: lightOrderData,
            returnUrl,
            cancelUrl
          }
        });

        console.log('Stripe response:', { data, error });

        // Check for errors in response
        if (error) {
          console.error('Supabase function error:', error);
          throw new Error(error.message || 'Errore nella creazione del checkout');
        }
        
        // Check if data contains error from edge function
        if (data?.error) {
          console.error('Edge function error:', data.error);
          throw new Error(data.error);
        }
        
        // Check if we got a valid URL
        if (!data?.url) {
          console.error('No checkout URL in response:', data);
          throw new Error('URL di checkout non ricevuto');
        }

        // Session ID serves to recover the order payload after Stripe redirects
        if (!data?.sessionId) {
          console.error('No sessionId in response:', data);
          throw new Error('Session ID di pagamento non ricevuto');
        }

        if (!session?.user?.id) {
          throw new Error('Sessione utente non valida');
        }

        // Create minimal payload without images to avoid localStorage quota
        const minimalOrderData = orderData.orderData ? {
          name: orderData.orderData.name,
          phone: orderData.orderData.phone,
          address: orderData.orderData.address,
          store: orderData.orderData.store,
          deliveryDate: orderData.orderData.deliveryDate,
          timeSlot: orderData.orderData.timeSlot,
          latitude: orderData.orderData.latitude,
          longitude: orderData.orderData.longitude,
          items: (orderData.orderData.items || []).map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            isEstimated: item.isEstimated,
            suggestion: item.suggestion
          })),
          subscription: subscriptionData
        } : null;

        const pendingPayload = {
          total: finalTotal,
          itemCount,
          deliveryFee,
          discount,
          serviceFee,
          supplements,
          schedulingAdjustment,
          subtotal,
          paymentMethod: 'card',
          orderData: minimalOrderData,
          voucherCode: orderData.voucherCode || null,
          voucherDiscount: orderData.voucherDiscount || 0,
          voucherId: orderData.voucherId || null
        };

        // Persist pending order server-side to avoid losing it across redirects/browser storage issues
        const { error: pendingDbError } = await supabase
          .from('pending_orders')
          .upsert(
            {
              user_id: session.user.id,
              stripe_session_id: data.sessionId,
              payload: pendingPayload,
            },
            { onConflict: 'stripe_session_id' }
          );

        if (pendingDbError) {
          console.error('Error saving pending order to DB:', pendingDbError);
          throw new Error(
            "Impossibile salvare i dati dell'ordine prima del pagamento. Riprova."
          );
        }

        // Keep local copy as fast path - now using minimal payload
        try {
          localStorage.setItem('pendingOrder', JSON.stringify(pendingPayload));
        } catch (storageError) {
          console.warn('localStorage quota exceeded, relying on DB storage');
        }

        console.log('Redirecting to Stripe:', data.url);

        // Redirect to Stripe checkout in same tab
        window.location.href = data.url;
        return;
      } catch (error: any) {
        console.error('Stripe error:', error);
        toast({
          title: "Errore Stripe",
          description: error?.message || "Impossibile avviare il pagamento. Riprova.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }
    }

    // If PayPal, create order and redirect
    if (paymentMethod === 'paypal') {
      setProcessing(true);
      try {
        const returnUrl = `${window.location.origin}/paypal-success`;
        const cancelUrl = `${window.location.origin}/checkout`;
        
        const { data, error } = await supabase.functions.invoke('create-paypal-order', {
          body: { 
            amount: finalTotal,
            returnUrl,
            cancelUrl
          }
        });

        if (error) throw error;
        
        // Create minimal payload without images to avoid localStorage quota
        const minimalOrderDataPaypal = orderData.orderData ? {
          name: orderData.orderData.name,
          phone: orderData.orderData.phone,
          address: orderData.orderData.address,
          store: orderData.orderData.store,
          deliveryDate: orderData.orderData.deliveryDate,
          timeSlot: orderData.orderData.timeSlot,
          latitude: orderData.orderData.latitude,
          longitude: orderData.orderData.longitude,
          items: (orderData.orderData.items || []).map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            isEstimated: item.isEstimated,
            suggestion: item.suggestion
          })),
          subscription: subscriptionData
        } : null;

        // Store minimal order data in localStorage
        try {
          localStorage.setItem('pendingOrder', JSON.stringify({
            total: finalTotal,
            itemCount,
            deliveryFee,
            discount,
            serviceFee,
            subtotal,
            paymentMethod: 'paypal',
            orderData: minimalOrderDataPaypal,
            voucherCode: orderData.voucherCode || null,
            voucherDiscount: orderData.voucherDiscount || 0,
            voucherId: orderData.voucherId || null
          }));
        } catch (storageError) {
          console.error('localStorage error:', storageError);
          toast({
            title: "Errore",
            description: "Impossibile salvare i dati dell'ordine. Riprova.",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }
        
        // Redirect to PayPal
        window.location.href = data.approvalUrl;
        return;
      } catch (error) {
        console.error('PayPal error:', error);
        toast({
          title: "Errore PayPal",
          description: "Impossibile avviare il pagamento. Riprova.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }
    }

    setProcessing(true);

    try {
      // Generate pickup code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_pickup_code');
      
      if (codeError) throw codeError;

      const pickupCode = codeData;

      // Save order with user_id
      const { data: orderInserted, error: insertError } = await supabase.from('orders').insert({
        pickup_code: pickupCode,
        user_id: session?.user.id,
        customer_name: orderData.orderData.name,
        customer_phone: orderData.orderData.phone,
        delivery_address: orderData.orderData.address,
        store_name: orderData.orderData.store,
        delivery_date: orderData.orderData.deliveryDate,
        time_slot: orderData.orderData.timeSlot,
        items: orderData.orderData.items,
        total_amount: subtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        voucher_code: null,
        voucher_discount: 0,
        payment_method: paymentMethod,
        status: 'confirmed',
        latitude: orderData.orderData.latitude,
        longitude: orderData.orderData.longitude
      }).select().single();

      if (insertError) throw insertError;

      // If subscription delivery was used, decrement the count
      if (subscriptionData?.usedDelivery) {
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

      toast({
        title: "Pagamento completato!",
        description: "Ordine confermato con successo",
      });

      setTimeout(() => {
        navigate("/tracking", { state: { pickupCode } });
      }, 1500);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare l'ordine. Riprova.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { id: "satispay", name: "Satispay", icon: Wallet, description: "Pagamento rapido e sicuro" },
    { id: "paypal", name: "PayPal", icon: Wallet, description: "Paga con il tuo account PayPal" },
    { id: "card", name: "Carta di credito/debito", icon: CreditCard, description: "Visa, Mastercard, American Express" },
    { id: "meal-voucher", name: "Buoni pasto", icon: Receipt, description: "Ticket Restaurant, Edenred, Day" },
  ];


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se non ci sono dati ordine validi, mostra messaggio e reindirizza
  if (!orderData.orderData || itemCount === 0 || finalTotal === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Nessun ordine in corso</h1>
            <p className="text-muted-foreground">I dati dell'ordine non sono disponibili</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-muted-foreground">
                I dati dell'ordine sono andati persi. Per favore, ricrea il tuo ordine.
              </p>
              <Button onClick={() => navigate("/ordina")} className="w-full">
                Vai alla pagina ordine
              </Button>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToOrder}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Modifica ordine
          </Button>
          <h1 className="text-3xl font-bold mb-2">Pagamento</h1>
          <p className="text-muted-foreground">Scegli il metodo di pagamento preferito</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Riepilogo ordine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Subscription Banner */}
            {subscriptionData && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Alfredo Extra {subscriptionData.plan === "yearly" ? "Plus" : "Base"}</p>
                  <p className="text-xs text-muted-foreground">
                    {subscriptionData.usedDelivery 
                      ? "Consegna gratuita inclusa"
                      : `Product picking scontato (€${subscriptionData.pickingFee}/prodotto)`
                    }
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">Attivo</Badge>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotale prodotti ({itemCount} articoli)</span>
              <span className="font-semibold">€{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo consegna</span>
              {subscriptionData?.usedDelivery ? (
                <span className="font-semibold text-green-600">GRATIS</span>
              ) : (
                <span className="font-semibold">€{deliveryFee.toFixed(2)}</span>
              )}
            </div>
            
            {serviceFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo del servizio</span>
                <span className="font-semibold">€{serviceFee.toFixed(2)}</span>
              </div>
            )}
            
            {/* Detailed supplements breakdown */}
            {supplements.bagFee > 0 && (
              <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                <span>Supplemento borse extra</span>
                <span className="font-semibold">+€{supplements.bagFee.toFixed(2)}</span>
              </div>
            )}
            {supplements.waterFee > 0 && (
              <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                <span>Supplemento eccedenza acqua (&gt;9L)</span>
                <span className="font-semibold">+€{supplements.waterFee.toFixed(2)}</span>
              </div>
            )}
            {supplements.waterOnlyFee > 0 && (
              <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                <span>Ordine solo bevande</span>
                <span className="font-semibold">+€{supplements.waterOnlyFee.toFixed(2)}</span>
              </div>
            )}
            {supplements.holidayFee > 0 && (
              <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                <span>Supplemento festività</span>
                <span className="font-semibold">+€{supplements.holidayFee.toFixed(2)}</span>
              </div>
            )}
            
            {schedulingAdjustment.amount !== 0 && (
              <div className={`flex justify-between ${
                schedulingAdjustment.amount > 0 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-green-600 dark:text-green-400"
              }`}>
                <span>{schedulingAdjustment.amount > 0 ? "Supplemento urgenza" : "Sconto programmazione"}</span>
                <span className="font-semibold">
                  {schedulingAdjustment.amount > 0 ? '+' : ''}€{schedulingAdjustment.amount.toFixed(2)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Sconto fedeltà</span>
              <span className="font-semibold">-€{discount.toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-3 flex justify-between text-lg">
              <span className="font-bold">Totale</span>
              <span className="font-bold">€{finalTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metodo di pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isMealVoucher = method.id === 'meal-voucher';
                  // Meal vouchers are always disabled with "SOON" badge
                  const isDisabled = isMealVoucher;
                  
                  return (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-muted' 
                          : 'cursor-pointer'
                      } ${
                        paymentMethod === method.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => !isDisabled && setPaymentMethod(method.id)}
                    >
                      <RadioGroupItem 
                        value={method.id} 
                        id={method.id} 
                        disabled={isDisabled}
                      />
                      <Icon className={`h-5 w-5 ${isDisabled ? 'text-muted-foreground' : 'text-primary'}`} />
                      <div className="flex-1">
                        <Label 
                          htmlFor={method.id} 
                          className={`font-semibold ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'} flex items-center gap-2`}
                        >
                          {method.name}
                          {isMealVoucher && (
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                              PRESTO DISPONIBILE
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Button onClick={handlePayment} className="w-full" size="lg" disabled={processing}>
          {processing ? "Elaborazione..." : `Conferma e paga €${finalTotal.toFixed(2)}`}
        </Button>
      </div>

      <Navigation />
    </div>
  );
};

export default Checkout;
