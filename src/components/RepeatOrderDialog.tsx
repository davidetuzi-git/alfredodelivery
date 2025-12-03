import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  CreditCard, 
  Wallet, 
  Receipt, 
  Loader2,
  ShoppingBag,
  MapPin,
  Crown,
  Check
} from "lucide-react";
import DeliveryDatePicker from "@/components/DeliveryDatePicker";
import { calculateSchedulingAdjustment } from "@/hooks/useSchedulingPricing";
import { useServiceCalendar } from "@/hooks/useServiceCalendar";
import { useSubscription } from "@/hooks/useSubscription";
import { useLoyalty } from "@/hooks/useLoyalty";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface Order {
  id: string;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  store_name: string;
  total_amount: number;
  delivery_fee: number;
  discount: number;
  items: any;
  latitude?: number;
  longitude?: number;
}

interface RepeatOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  session: Session | null;
}

const TIME_SLOTS = [
  "9:00 - 11:00",
  "11:00 - 13:00",
  "15:00 - 17:00",
  "17:00 - 19:00"
];

export const RepeatOrderDialog = ({ 
  open, 
  onOpenChange, 
  order,
  session 
}: RepeatOrderDialogProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processing, setProcessing] = useState(false);

  const { isDateHoliday } = useServiceCalendar();
  const { subscription, benefits: subscriptionBenefits, decrementDelivery } = useSubscription();
  const { loyaltyProfile, getBenefits } = useLoyalty();
  const loyaltyBenefits = loyaltyProfile ? getBenefits(loyaltyProfile.current_level) : null;

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setDeliveryDate(undefined);
      setTimeSlot("");
      setPaymentMethod("");
    }
  }, [open]);

  if (!order) return null;

  // Calculate prices
  const items = order.items || [];
  const subtotal = items.reduce((sum: number, item: any) => 
    sum + ((item.price || 0) * (item.quantity || 1)), 0
  );
  
  // Service/picking fee
  const pickingFee = subscriptionBenefits.pickingFeePerProduct;
  const serviceFee = items.reduce((sum: number, item: any) => 
    sum + ((item.quantity || 1) * pickingFee), 0
  );

  // Determine if using free delivery from subscription
  const useSubscriptionDelivery = subscriptionBenefits.deliveriesRemaining > 0;
  
  // Calculate delivery fee
  const calculateDeliveryFee = () => {
    if (useSubscriptionDelivery) return { baseFee: 0, loyaltyDiscount: 0, finalFee: 0 };
    
    // Use standard delivery fee (assuming same distance as original order)
    let baseFee = order.delivery_fee || 10;
    const loyaltyDiscountPercent = loyaltyBenefits?.deliveryDiscount || 0;
    const loyaltyDiscount = baseFee * (loyaltyDiscountPercent / 100);
    const finalFee = baseFee - loyaltyDiscount;
    
    return { baseFee, loyaltyDiscount, finalFee };
  };

  const deliveryFeeInfo = calculateDeliveryFee();
  
  // Scheduling adjustment
  const schedulingAdjustment = deliveryDate ? calculateSchedulingAdjustment(deliveryDate) : null;
  const holidayInfo = deliveryDate ? isDateHoliday(deliveryDate) : { isHoliday: false };
  const holidaySurcharge = holidayInfo.isHoliday ? (holidayInfo.surcharge || 10) : 0;
  const schedulingAmount = schedulingAdjustment?.amount || 0;

  // Total calculation
  const total = subtotal + serviceFee + deliveryFeeInfo.finalFee + schedulingAmount + holidaySurcharge;

  const paymentMethods = [
    { id: "satispay", name: "Satispay", icon: Wallet },
    { id: "paypal", name: "PayPal", icon: Wallet },
    { id: "card", name: "Carta di credito/debito", icon: CreditCard },
    { id: "meal-voucher", name: "Buoni pasto", icon: Receipt, disabled: true },
  ];

  const handleNext = () => {
    if (step === 1 && !deliveryDate) {
      toast({ title: "Seleziona una data di consegna", variant: "destructive" });
      return;
    }
    if (step === 2 && !timeSlot) {
      toast({ title: "Seleziona una fascia oraria", variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({ title: "Seleziona un metodo di pagamento", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      // For card payment, create Stripe checkout
      if (paymentMethod === 'card') {
        const returnUrl = `${window.location.origin}/stripe-success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}/i-miei-ordini`;
        
        const lightItems = items.map((item: any) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          suggestion: item.suggestion
        }));
        
        const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
          body: { 
            amount: total,
            orderData: {
              name: order.customer_name,
              phone: order.customer_phone,
              address: order.delivery_address,
              store: order.store_name,
              deliveryDate: deliveryDate?.toISOString(),
              timeSlot,
              items: lightItems,
              latitude: order.latitude,
              longitude: order.longitude,
              subscription: useSubscriptionDelivery ? {
                plan: subscription?.plan,
                usedDelivery: true,
                pickingFee: pickingFee
              } : null
            },
            returnUrl,
            cancelUrl
          }
        });

        if (error) throw error;
        
        sessionStorage.setItem('pendingOrder', JSON.stringify({
          orderData: {
            name: order.customer_name,
            phone: order.customer_phone,
            address: order.delivery_address,
            store: order.store_name,
            deliveryDate: deliveryDate?.toISOString(),
            timeSlot,
            items: lightItems,
            latitude: order.latitude,
            longitude: order.longitude
          },
          total: subtotal,
          deliveryFee: deliveryFeeInfo.finalFee,
          paymentMethod: 'card'
        }));
        
        window.open(data.url, '_blank');
        setProcessing(false);
        onOpenChange(false);
        
        toast({
          title: "Checkout Stripe aperto",
          description: "Completa il pagamento nella nuova scheda",
        });
        return;
      }

      // For PayPal
      if (paymentMethod === 'paypal') {
        const returnUrl = `${window.location.origin}/paypal-success`;
        const cancelUrl = `${window.location.origin}/i-miei-ordini`;
        
        const { data, error } = await supabase.functions.invoke('create-paypal-order', {
          body: { 
            amount: total,
            returnUrl,
            cancelUrl
          }
        });

        if (error) throw error;
        
        sessionStorage.setItem('pendingOrder', JSON.stringify({
          orderData: {
            name: order.customer_name,
            phone: order.customer_phone,
            address: order.delivery_address,
            store: order.store_name,
            deliveryDate: deliveryDate?.toISOString(),
            timeSlot,
            items: items,
            latitude: order.latitude,
            longitude: order.longitude
          },
          total: subtotal,
          deliveryFee: deliveryFeeInfo.finalFee,
          paymentMethod: 'paypal'
        }));
        
        window.location.href = data.approvalUrl;
        return;
      }

      // For other payment methods (Satispay, etc.) - create order directly
      const { data: codeData, error: codeError } = await supabase.rpc('generate_pickup_code');
      if (codeError) throw codeError;

      const pickupCode = codeData;

      const { data: orderInserted, error: insertError } = await supabase.from('orders').insert({
        pickup_code: pickupCode,
        user_id: session?.user.id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        delivery_address: order.delivery_address,
        store_name: order.store_name,
        delivery_date: deliveryDate?.toISOString(),
        time_slot: timeSlot,
        items: items,
        total_amount: subtotal,
        delivery_fee: deliveryFeeInfo.finalFee,
        discount: 0,
        payment_method: paymentMethod,
        status: 'confirmed',
        latitude: order.latitude,
        longitude: order.longitude
      }).select().single();

      if (insertError) throw insertError;

      // Decrement subscription delivery if used
      if (useSubscriptionDelivery) {
        await decrementDelivery();
      }

      // Notify deliverers
      if (orderInserted) {
        supabase.functions.invoke('notify-deliverers', {
          body: { order_id: orderInserted.id }
        });
      }

      toast({
        title: "Ordine confermato!",
        description: `Codice ritiro: ${pickupCode}`,
      });

      onOpenChange(false);
      navigate("/tracking", { state: { pickupCode } });

    } catch (error) {
      console.error('Error processing order:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare l'ordine. Riprova.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Ripeti Ordine
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Order summary card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShoppingBag className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{order.store_name}</p>
                <p className="text-sm text-muted-foreground">{items.length} articoli</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {order.delivery_address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Date selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data di consegna
              </Label>
              <DeliveryDatePicker
                value={deliveryDate}
                onChange={setDeliveryDate}
              />
            </div>
            
            <Button onClick={handleNext} className="w-full">
              Continua
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Time slot selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Fascia oraria
              </Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una fascia oraria" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Indietro
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continua
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Price summary */}
            <Card>
              <CardContent className="p-4 space-y-2">
                {useSubscriptionDelivery && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg mb-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Consegna gratuita inclusa</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotale ({items.length} articoli)</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo del servizio</span>
                  <span>€{serviceFee.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Consegna</span>
                  {useSubscriptionDelivery ? (
                    <span className="text-green-600 font-medium">GRATIS</span>
                  ) : (
                    <span>€{deliveryFeeInfo.finalFee.toFixed(2)}</span>
                  )}
                </div>
                
                {schedulingAmount !== 0 && (
                  <div className={`flex justify-between text-sm ${
                    schedulingAmount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    <span>{schedulingAmount > 0 ? 'Supplemento urgenza' : 'Sconto programmazione'}</span>
                    <span>{schedulingAmount > 0 ? '+' : ''}€{schedulingAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {holidaySurcharge > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Supplemento festività</span>
                    <span>+€{holidaySurcharge.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Totale</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment methods */}
            <div className="space-y-2">
              <Label>Metodo di pagamento</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                          method.disabled 
                            ? 'opacity-50 cursor-not-allowed bg-muted' 
                            : 'cursor-pointer hover:bg-muted/50'
                        } ${paymentMethod === method.id ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => !method.disabled && setPaymentMethod(method.id)}
                      >
                        <RadioGroupItem 
                          value={method.id} 
                          id={method.id}
                          disabled={method.disabled}
                        />
                        <Icon className="h-4 w-4 text-primary" />
                        <Label 
                          htmlFor={method.id} 
                          className={`flex-1 ${!method.disabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {method.name}
                          {method.disabled && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              PRESTO
                            </Badge>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1" disabled={processing}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Indietro
              </Button>
              <Button onClick={handlePayment} className="flex-1" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>Conferma €{total.toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
