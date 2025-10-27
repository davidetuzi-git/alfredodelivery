import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Plus, X, Loader2, CalendarIcon } from "lucide-react";
import SupermarketMap from "@/components/SupermarketMap";
import ProductPriceSearch from "@/components/ProductPriceSearch";
import PriceComparison from "@/components/PriceComparison";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ShoppingItem {
  name: string;
  price: number | null;
  loading: boolean;
  quantity: number;
  suggestion: string | null;
}

const Order = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [store, setStore] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState("");
  const [items, setItems] = useState<ShoppingItem[]>([{ name: "", price: null, loading: false, quantity: 1, suggestion: null }]);

  const stores = [
    "Esselunga - Via Roma 123",
    "Carrefour - Piazza Duomo 45",
    "Coop - Corso Italia 67",
    "Conad - Via Milano 89",
    "Pam - Viale Europa 12"
  ];

  const timeSlots = [
    "9:00 - 11:00",
    "11:00 - 13:00",
    "15:00 - 17:00",
    "17:00 - 19:00"
  ];

  const addItem = () => {
    setItems([...items, { name: "", price: null, loading: false, quantity: 1, suggestion: null }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemName = (index: number, name: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name, suggestion: null };
    setItems(newItems);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], quantity: Math.max(1, quantity) };
    setItems(newItems);
  };

  const fetchPrice = async (index: number, productName: string) => {
    if (!productName.trim() || !store) return;

    const newItems = [...items];
    newItems[index] = { ...newItems[index], loading: true };
    setItems(newItems);

    try {
      const { data, error } = await supabase.functions.invoke('search-product-price', {
        body: { 
          product: productName.trim(),
          storeName: store 
        }
      });

      if (!error && data?.needsDetails) {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], loading: false, suggestion: data.suggestion, price: null };
        setItems(updatedItems);
      } else if (!error && data?.price) {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], price: data.price, loading: false, suggestion: null };
        setItems(updatedItems);
      } else {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], loading: false };
        setItems(updatedItems);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      const updatedItems = [...items];
      updatedItems[index] = { ...updatedItems[index], loading: false };
      setItems(updatedItems);
    }
  };

  const total = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.name.trim() !== "");
    
    if (!name || !phone || !address || !store || !deliveryDate || !timeSlot || validItems.length === 0) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori e aggiungi almeno un prodotto",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ordine inviato!",
      description: `Totale: €${total.toFixed(2)}. Procedi al pagamento per confermare`,
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
                <Tabs defaultValue="list" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list">Lista</TabsTrigger>
                    <TabsTrigger value="map">Mappa</TabsTrigger>
                  </TabsList>
                  <TabsContent value="list" className="mt-4">
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
                  </TabsContent>
                  <TabsContent value="map" className="mt-4">
                    <SupermarketMap onSelectStore={setStore} deliveryAddress={address} />
                    {store && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selezionato: <strong>{store}</strong>
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Data di consegna</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP", { locale: it }) : "Seleziona una data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Cerca prezzi prodotti</Label>
                <ProductPriceSearch storeName={store} />
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
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Es: Latte Conad 1L"
                          value={item.name}
                          onChange={(e) => updateItemName(index, e.target.value)}
                          onBlur={() => fetchPrice(index, item.name)}
                          required
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="text-center"
                          placeholder="Qtà"
                        />
                      </div>
                      <div className="w-28 text-right font-medium flex items-center justify-end gap-2">
                        {item.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : item.price !== null ? (
                          <span>€{(item.price * item.quantity).toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
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
                    {item.suggestion && (
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm">
                        <p className="text-amber-900 dark:text-amber-100">
                          💡 <strong>Suggerimento:</strong> {item.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {total > 0 && (
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-semibold text-lg">Totale stimato:</span>
                    <span className="font-bold text-xl text-primary">€{total.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <PriceComparison items={items} />

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
