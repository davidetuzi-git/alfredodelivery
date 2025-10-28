import { Navigation } from "@/components/Navigation";
import ProductPriceSearch from "@/components/ProductPriceSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PriceSearch = () => {
  const [store, setStore] = useState("");
  const [isStoreSelected, setIsStoreSelected] = useState(false);

  const stores = [
    "Esselunga - Via Tuscolana 123, Roma",
    "Carrefour Express - Via Appia Nuova 45, Roma",
    "Coop - Via dei Castani 67, Roma",
    "Conad - Viale Manzoni 89, Roma",
    "Lidl - Via Casilina 234, Roma",
    "Eurospin - Via Corradini 34, Avezzano",
    "Conad City - Piazza del Mercato 12, Anzio",
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Cerca Prezzi</h1>
          <p className="text-muted-foreground">Confronta i prezzi dei prodotti nei supermercati</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Ricerca Prezzi Prodotti</CardTitle>
            <CardDescription>
              Seleziona un supermercato e cerca i prezzi dei prodotti che ti interessano
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isStoreSelected ? (
              <div className="space-y-2">
                <Label htmlFor="store">Supermercato</Label>
                <Select value={store} onValueChange={(value) => {
                  setStore(value);
                  setIsStoreSelected(true);
                }}>
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
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-muted-foreground">Supermercato selezionato</Label>
                    <p className="font-medium">{store}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStore("");
                      setIsStoreSelected(false);
                    }}
                  >
                    Cambia
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Cerca prodotto</Label>
                  <ProductPriceSearch storeName={store} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default PriceSearch;
