import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { CreditCard, ArrowLeft, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CardPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(false);
  
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const orderData = location.state || {};
  const subtotal = orderData.total || 0;
  const deliveryFee = orderData.deliveryFee || 3.99;
  const discount = orderData.discount || 4.99;
  const finalTotal = subtotal + deliveryFee - discount;

  const handleBackToCheckout = () => {
    navigate("/checkout", { state: orderData });
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(formatExpiryDate(e.target.value));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCvv(value.substring(0, 4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length !== 16) {
      toast({
        title: "Errore",
        description: "Numero carta non valido",
        variant: "destructive",
      });
      return;
    }

    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      toast({
        title: "Errore",
        description: "Data di scadenza non valida",
        variant: "destructive",
      });
      return;
    }

    if (cvv.length < 3) {
      toast({
        title: "Errore",
        description: "CVV non valido",
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
        payment_method: 'card',
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
        description: "Impossibile completare il pagamento. Riprova.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToCheckout}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna indietro
          </Button>
          <h1 className="text-3xl font-bold mb-2">Pagamento con carta</h1>
          <p className="text-muted-foreground">Inserisci i dati della tua carta</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Pagamento sicuro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Numero carta</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    required
                    maxLength={19}
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardHolder">Intestatario carta</Label>
                <Input
                  id="cardHolder"
                  placeholder="MARIO ROSSI"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Scadenza</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/AA"
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    required
                    maxLength={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    type="password"
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                    required
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotale</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo consegna</span>
                  <span>€{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sconto</span>
                  <span className="text-green-600">-€{discount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Totale da pagare</span>
                  <span>€{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={processing}
              >
                {processing ? "Elaborazione..." : `Paga €${finalTotal.toFixed(2)}`}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                <Lock className="inline h-3 w-3 mr-1" />
                I tuoi dati sono protetti con crittografia SSL
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default CardPayment;
