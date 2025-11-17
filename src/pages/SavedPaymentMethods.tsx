import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SavedPaymentMethod {
  id: string;
  payment_type: string;
  label: string;
  card_last_four: string | null;
  is_default: boolean;
}

const SavedPaymentMethods = () => {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    payment_type: "",
    label: "",
    card_last_four: "",
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('saved_payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i metodi di pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPayment.payment_type || !newPayment.label) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('saved_payment_methods')
        .insert({
          user_id: user.id,
          ...newPayment,
        });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Metodo di pagamento salvato",
      });

      setIsDialogOpen(false);
      setNewPayment({
        payment_type: "",
        label: "",
        card_last_four: "",
      });
      loadPaymentMethods();
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il metodo di pagamento",
        variant: "destructive",
      });
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Metodo di pagamento eliminato",
      });
      loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il metodo di pagamento",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('saved_payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('saved_payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Metodo di pagamento predefinito aggiornato",
      });
      loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({
        title: "Errore",
        description: "Impossibile impostare come predefinito",
        variant: "destructive",
      });
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      card: "Carta di credito/debito",
      paypal: "PayPal",
      satispay: "Satispay",
      meal_voucher: "Buono pasto"
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profilo")}
            className="mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Indietro
          </Button>
          <h1 className="text-3xl font-bold">Metodi di Pagamento</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6">
              <Plus className="h-5 w-5 mr-2" />
              Aggiungi metodo di pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Metodo di Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="payment_type">Tipo</Label>
                <Select value={newPayment.payment_type} onValueChange={(value) => setNewPayment({ ...newPayment, payment_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Carta di credito/debito</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="satispay">Satispay</SelectItem>
                    <SelectItem value="meal_voucher">Buono pasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="label">Etichetta</Label>
                <Input
                  id="label"
                  value={newPayment.label}
                  onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })}
                  placeholder="Es: Carta principale"
                />
              </div>
              {newPayment.payment_type === "card" && (
                <div>
                  <Label htmlFor="card_last_four">Ultime 4 cifre (opzionale)</Label>
                  <Input
                    id="card_last_four"
                    value={newPayment.card_last_four}
                    onChange={(e) => setNewPayment({ ...newPayment, card_last_four: e.target.value })}
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>
              )}
              <Button onClick={handleAddPaymentMethod} className="w-full">
                Salva Metodo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.is_default ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {method.label}
                        {method.is_default && (
                          <Star className="h-4 w-4 fill-primary text-primary" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getPaymentTypeLabel(method.payment_type)}
                        {method.card_last_four && ` •••• ${method.card_last_four}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePaymentMethod(method.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {!method.is_default && (
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(method.id)}
                  >
                    Imposta come predefinito
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
          {paymentMethods.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessun metodo di pagamento salvato
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPaymentMethods;