import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingCart, MapPin, Clock, Store } from "lucide-react";

const Order = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    store: "",
    timeSlot: "",
    shoppingList: "",
  });

  const stores = [
    "Conad - Via Roma",
    "Esselunga - Centro Città",
    "Carrefour - Zona Nord",
    "Lidl - Via Milano",
    "Pam - Centro Commerciale"
  ];

  const timeSlots = [
    "Mattina (9:00 - 12:00)",
    "Pranzo (12:00 - 15:00)",
    "Pomeriggio (15:00 - 18:00)",
    "Sera (18:00 - 21:00)"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.address || !formData.store || !formData.timeSlot || !formData.shoppingList) {
      toast.error("Per favore compila tutti i campi");
      return;
    }

    toast.success("Ordine inviato con successo! Ti contatteremo a breve.");
    setTimeout(() => navigate("/"), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          ← Torna alla Home
        </Button>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Ordina la Tua Spesa
            </h1>
            <p className="text-lg text-muted-foreground">
              Compila il modulo e un nostro Alfredo si occuperà di tutto
            </p>
          </div>

          <Card className="animate-slide-up shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Dettagli Ordine
              </CardTitle>
              <CardDescription>
                Inserisci i tuoi dati e la lista della spesa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dati Personali */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    I Tuoi Dati
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome e Cognome *</Label>
                    <Input
                      id="name"
                      placeholder="Mario Rossi"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono / WhatsApp *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+39 333 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Indirizzo di Consegna *</Label>
                    <Input
                      id="address"
                      placeholder="Via Roma 123, Anzio (RM)"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Supermercato */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Scegli il Supermercato
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="store">Supermercato Preferito *</Label>
                    <Select 
                      value={formData.store} 
                      onValueChange={(value) => setFormData({ ...formData, store: value })}
                    >
                      <SelectTrigger id="store">
                        <SelectValue placeholder="Seleziona un supermercato" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store} value={store}>
                            {store}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fascia Oraria */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Fascia Oraria
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeSlot">Quando Vuoi Ricevere la Spesa? *</Label>
                    <Select 
                      value={formData.timeSlot} 
                      onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}
                    >
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
                </div>

                {/* Lista Spesa */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Lista della Spesa</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shoppingList">
                      Cosa Devi Comprare? *
                    </Label>
                    <Textarea
                      id="shoppingList"
                      placeholder="Es: 1kg pasta, 2 litri latte, pane, pomodori, 500g carne macinata..."
                      className="min-h-[150px]"
                      value={formData.shoppingList}
                      onChange={(e) => setFormData({ ...formData, shoppingList: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Scrivi liberamente la tua lista. Ti ricontatteremo con il preventivo finale.
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-lg h-12"
                  size="lg"
                >
                  Invia Ordine
                </Button>

                <p className="text-sm text-center text-muted-foreground">
                  Riceverai una conferma via WhatsApp con il preventivo dettagliato
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Order;
