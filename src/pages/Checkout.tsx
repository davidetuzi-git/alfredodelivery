import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { CreditCard, Wallet, Receipt, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processing, setProcessing] = useState(false);
  const [acceptsMealVouchers, setAcceptsMealVouchers] = useState(false);
  const [mealVoucherTypes, setMealVoucherTypes] = useState<string[]>([]);
  const [loadingStoreInfo, setLoadingStoreInfo] = useState(true);
  
  const orderData = location.state || {};
  const subtotal = orderData.total || 0;
  const deliveryFee = orderData.deliveryFee || 3.99;
  const discount = orderData.discount || 4.99;
  const itemCount = orderData.itemCount || 0;
  const finalTotal = subtotal + deliveryFee - discount;
  const storeName = orderData.orderData?.store || "";

  useEffect(() => {
    const checkStoreVouchers = async () => {
      if (!storeName) return;
      
      setLoadingStoreInfo(true);
      try {
        // Extract store name from "Store - Address" format
        const storeNameOnly = storeName.split(' - ')[0].trim();
        
        const { data, error } = await supabase
          .from('supermarkets')
          .select('accepts_meal_vouchers, meal_voucher_types')
          .ilike('name', storeNameOnly)
          .limit(1)
          .single();
        
        if (!error && data) {
          setAcceptsMealVouchers(data.accepts_meal_vouchers);
          setMealVoucherTypes(data.meal_voucher_types as string[] || []);
        } else {
          setAcceptsMealVouchers(false);
          setMealVoucherTypes([]);
        }
      } catch (error) {
        console.error('Error checking store vouchers:', error);
        setAcceptsMealVouchers(false);
        setMealVoucherTypes([]);
      } finally {
        setLoadingStoreInfo(false);
      }
    };

    checkStoreVouchers();
  }, [storeName]);

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

    // Check if meal vouchers are selected but not accepted
    if (paymentMethod === 'meal-voucher' && !acceptsMealVouchers) {
      toast({
        title: "Metodo non accettato",
        description: `Il supermercato ${storeName.split(' - ')[0]} non accetta buoni pasto`,
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

    // If card payment, redirect to card payment page
    if (paymentMethod === 'card') {
      navigate("/card-payment", { 
        state: {
          ...orderData,
          total: subtotal,
          deliveryFee: deliveryFee,
          discount: discount
        } 
      });
      return;
    }

    setProcessing(true);

    try {
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
        total_amount: subtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        payment_method: paymentMethod,
        status: 'confirmed'
      });

      if (insertError) throw insertError;

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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prodotti ({itemCount} articoli)</span>
              <span className="font-semibold">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consegna</span>
              <span className="font-semibold">€{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sconto fedeltà</span>
              <span className="font-semibold text-green-600">-€{discount.toFixed(2)}</span>
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
            {!loadingStoreInfo && !acceptsMealVouchers && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Questo supermercato non accetta buoni pasto. Scegli un altro metodo di pagamento.
                </AlertDescription>
              </Alert>
            )}
            
            {!loadingStoreInfo && acceptsMealVouchers && mealVoucherTypes.length > 0 && (
              <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Buoni pasto accettati: {mealVoucherTypes.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isMealVoucher = method.id === 'meal-voucher';
                  const isDisabled = isMealVoucher && !acceptsMealVouchers;
                  
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
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <Label 
                          htmlFor={method.id} 
                          className={`font-semibold ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {method.name}
                          {isMealVoucher && !acceptsMealVouchers && (
                            <span className="ml-2 text-xs text-muted-foreground">(Non disponibile)</span>
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
