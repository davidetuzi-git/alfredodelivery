import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Plus, X } from "lucide-react";

const Order = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [store, setStore] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [items, setItems] = useState<string[]>([""]);

  const stores = [
    "Esselunga - Via Roma 123",
    "Carrefour - Piazza Duomo 45",
    "Coop - Corso Italia 67",
    "Conad - Via Milano 89",
    "Pam - Viale Europa 12"
  ];

  const timeSlots = [
    "Oggi 9:00 - 11:00",
    "Oggi 11:00 - 13:00",
    "Oggi 15:00 - 17:00",
    "Oggi 17:00 - 19:00",
    "Domani 9:00 - 11:00",
    "Domani 15:00 - 17:00"
  ];

  const addItem = () => {
    setItems([...items, ""]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.trim() !== "");
    
    if (!name || !phone || !address || !store || !timeSlot || validItems.length === 0) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori e aggiungi almeno un prodotto",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ordine inviato!",
      description: "Procedi al pagamento per confermare",
    });

    setTimeout(() => {
      navigate("/checkout");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Ordine rapido</h1>
          <p className="text-muted-foreground">Compila i dati e aggiungi i prodotti</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli ordine</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome e cognome</Label>
                <Input
                  id="name"
                  placeholder="Mario Rossi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+39 333 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo di consegna</Label>
                <Input
                  id="address"
                  placeholder="Via Roma 123, Roma"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store">Supermercato</Label>
                <Select value={store} onValueChange={setStore}>
                  <SelectTrigger id="store">
                    <SelectValue placeholder="Seleziona un supermercato" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSlot">Fascia oraria</Label>
                <Select value={timeSlot} onValueChange={setTimeSlot}>
                  <SelectTrigger id="timeSlot">
                    <SelectValue placeholder="Seleziona una fascia oraria" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lista della spesa</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi prodotto
                  </Button>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Es: 1kg di mele"
                      value={item}
                      onChange={(e) => updateItem(index, e.target.value)}
                      required
                    />
                    {items.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full" size="lg">
                Procedi al pagamento
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Order;
