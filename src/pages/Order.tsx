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
import PriceComparison from "@/components/PriceComparison";
import AddressAutocomplete from "@/components/AddressAutocomplete";
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
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [store, setStore] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeSlot, setTimeSlot] = useState("");
  const [items, setItems] = useState<ShoppingItem[]>([{ name: "", price: null, loading: false, quantity: 1, suggestion: null }]);

  const stores = [
    "Esselunga - Via Tuscolana 123, Roma",
    "Carrefour Express - Via Appia Nuova 45, Roma",
    "Coop - Via dei Castani 67, Roma",
    "Conad - Viale Manzoni 89, Roma",
    "Lidl - Via Casilina 234, Roma",
    "Esselunga - Viale Piave 10, Milano",
    "Carrefour - Via Lorenteggio 251, Milano",
    "Coop - Via Famagosta 75, Milano",
    "Pam - Corso Buenos Aires 33, Milano",
    "Iper - Via Rubattino 84, Milano",
    "Carrefour - Via Livorno 60, Torino",
    "Esselunga - Corso Sebastopoli 150, Torino",
    "Coop - Via Nizza 262, Torino",
    "Carrefour - Via Argine 380, Napoli",
    "Esselunga - Via Pisana 130, Firenze",
    "Conad - Via Emilia Ponente 74, Bologna",
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

    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], loading: true };
      return newItems;
    });

    try {
      const { data, error } = await supabase.functions.invoke('search-product-price', {
        body: { 
          product: productName.trim(),
          storeName: store 
        }
      });

      if (!error && data?.needsDetails) {
        setItems(prevItems => {
          const updatedItems = [...prevItems];
          updatedItems[index] = { ...updatedItems[index], loading: false, suggestion: data.suggestion, price: null };
          return updatedItems;
        });
      } else if (!error && data?.price) {
        setItems(prevItems => {
          const updatedItems = [...prevItems];
          updatedItems[index] = { ...updatedItems[index], price: data.price, loading: false, suggestion: null };
          return updatedItems;
        });
      } else {
        setItems(prevItems => {
          const updatedItems = [...prevItems];
          updatedItems[index] = { ...updatedItems[index], loading: false };
          return updatedItems;
        });
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      setItems(prevItems => {
        const updatedItems = [...prevItems];
        updatedItems[index] = { ...updatedItems[index], loading: false };
        return updatedItems;
      });
    }
  };

  const total = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
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

    navigate("/checkout", { 
      state: { 
        total, 
        itemCount: validItems.length,
        deliveryFee: 3.99,
        discount: 4.99,
        orderData: {
          name,
          phone,
          address,
          store,
          deliveryDate: deliveryDate.toISOString(),
          timeSlot,
          items: validItems
        }
      } 
    });
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
                <AddressAutocomplete
                  value={address}
                  onSelect={(addr, lat, lon) => {
                    setAddress(addr);
                    setAddressCoords({ lat, lon });
                  }}
                  placeholder="Inizia a digitare un indirizzo in Italia..."
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
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                      onSelect={(date) => {
                        setDeliveryDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
                <Label>Lista della spesa</Label>
                
                {items.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-[6] min-w-0">
                        <Input
                          placeholder="Es: Latte Conad 1L"
                          value={item.name}
                          onChange={(e) => updateItemName(index, e.target.value)}
                          onBlur={() => fetchPrice(index, item.name)}
                          required
                          className="w-full"
                        />
                      </div>
                      <div className="w-16 flex-shrink-0">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="text-center"
                          placeholder="Qtà"
                        />
                      </div>
                      <div className="w-20 flex-shrink-0 text-right font-medium flex items-center justify-end gap-2">
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
                
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi prodotto
                </Button>
                
                {total > 0 && (
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-semibold text-lg">Totale stimato:</span>
                    <span className="font-bold text-xl text-primary">€{total.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <PriceComparison items={items} currentStore={store} />

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
