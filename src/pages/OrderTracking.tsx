import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { Package, CheckCircle, Clock, MapPin, Phone, MessageCircle, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const OrderTracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pickupCodeFromState = location.state?.pickupCode;
  
  const [pickupCode, setPickupCode] = useState(pickupCodeFromState || "");
  const [inputCode, setInputCode] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pickupCodeFromState) {
      loadOrder(pickupCodeFromState);
    }
  }, [pickupCodeFromState]);

  const loadOrder = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('pickup_code', code)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data);
        setPickupCode(code);
      } else {
        toast({
          title: "Errore",
          description: "Ordine non trovato",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare l'ordine",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchOrder = () => {
    if (inputCode.trim()) {
      loadOrder(inputCode.trim().toUpperCase());
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pickupCode);
    setCopied(true);
    toast({
      title: "Codice copiato!",
      description: "Il codice ritiro è stato copiato negli appunti",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Tracking ordine</h1>
            <p className="text-muted-foreground">Inserisci il codice per tracciare il tuo ordine</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Cerca ordine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Codice ritiro</Label>
                <Input
                  id="code"
                  placeholder="ES: ABC12345"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
                />
              </div>
              <Button onClick={handleSearchOrder} disabled={loading || !inputCode.trim()} className="w-full">
                {loading ? "Ricerca..." : "Cerca ordine"}
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
      <Header />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Tracking ordine</h1>
          <p className="text-muted-foreground">Segui in tempo reale il tuo ordine</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-gradient-to-br from-primary/5 to-background border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Codice ritiro</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-4xl font-bold tracking-wider">{pickupCode}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Mostra questo codice al momento del ritiro
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Ordine #{order.id.slice(0, 8)}</CardTitle>
              <Badge className="bg-yellow-500">{order.status === 'confirmed' ? 'Confermato' : 'In corso'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{order.store_name}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Telefono:</span>
                <span className="font-medium">{order.customer_phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Indirizzo:</span>
                <span className="font-medium text-right">{order.delivery_address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data consegna:</span>
                <span className="font-medium">{new Date(order.delivery_date).toLocaleDateString('it-IT')} - {order.time_slot}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riepilogo ordine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prodotti ({order.items.length} articoli)</span>
              <span className="font-semibold">€{parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consegna</span>
              <span className="font-semibold">€{parseFloat(order.delivery_fee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sconto</span>
              <span className="font-semibold text-green-600">-€{parseFloat(order.discount).toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg">
              <span className="font-bold">Totale</span>
              <span className="font-bold">€{(parseFloat(order.total_amount) + parseFloat(order.delivery_fee) - parseFloat(order.discount)).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Puoi condividere il codice
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                Chiunque abbia il codice ritiro può ritirare la spesa per tuo conto
              </div>
            </div>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default OrderTracking;
