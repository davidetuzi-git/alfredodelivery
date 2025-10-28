import { Navigation } from "@/components/Navigation";
import ProductPriceSearch from "@/components/ProductPriceSearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { calculateDistance } from "@/components/SupermarketMap";
import { useNavigate } from "react-router-dom";

interface Store {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const allStores: Store[] = [
  { name: "Esselunga", address: "Via Tuscolana 123, Roma", lat: 41.8719, lng: 12.5144 },
  { name: "Carrefour Express", address: "Via Appia Nuova 45, Roma", lat: 41.8769, lng: 12.5186 },
  { name: "Coop", address: "Via dei Castani 67, Roma", lat: 41.8689, lng: 12.5204 },
  { name: "Conad", address: "Viale Manzoni 89, Roma", lat: 41.8929, lng: 12.5014 },
  { name: "Lidl", address: "Via Casilina 234, Roma", lat: 41.8799, lng: 12.5456 },
  { name: "Eurospin", address: "Via Corradini 34, Avezzano", lat: 42.0301, lng: 13.4268 },
  { name: "Conad City", address: "Piazza del Mercato 12, Anzio", lat: 41.4497, lng: 12.6293 },
  { name: "Esselunga", address: "Viale Piave 10, Milano", lat: 45.4773, lng: 9.2058 },
  { name: "Carrefour", address: "Via Lorenteggio 251, Milano", lat: 45.4515, lng: 9.1371 },
  { name: "Coop", address: "Via Famagosta 75, Milano", lat: 45.4484, lng: 9.1595 },
  { name: "Pam", address: "Corso Buenos Aires 33, Milano", lat: 45.4781, lng: 9.2060 },
  { name: "Iper", address: "Via Rubattino 84, Milano", lat: 45.4935, lng: 9.2249 },
  { name: "Carrefour", address: "Via Livorno 60, Torino", lat: 45.0536, lng: 7.6598 },
  { name: "Esselunga", address: "Corso Sebastopoli 150, Torino", lat: 45.0415, lng: 7.6598 },
  { name: "Coop", address: "Via Nizza 262, Torino", lat: 45.0536, lng: 7.6819 },
  { name: "Carrefour", address: "Via Argine 380, Napoli", lat: 40.8564, lng: 14.3154 },
  { name: "Esselunga", address: "Via Pisana 130, Firenze", lat: 43.7696, lng: 11.2327 },
  { name: "Conad", address: "Via Emilia Ponente 74, Bologna", lat: 44.4949, lng: 11.3030 },
];

const PriceSearch = () => {
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [store, setStore] = useState("");
  const [isStoreSelected, setIsStoreSelected] = useState(false);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);

  const handleAddressSelect = (address: string, lat: number, lon: number) => {
    setDeliveryAddress(address);
    setAddressLat(lat);
    setAddressLng(lon);
  };

  const handleConfirmAddress = () => {
    if (!addressLat || !addressLng) return;

    const nearby = allStores
      .map(store => ({
        ...store,
        distance: calculateDistance(addressLat, addressLng, store.lat, store.lng)
      }))
      .filter(store => store.distance <= 10)
      .sort((a, b) => a.distance - b.distance);

    setNearbyStores(nearby);
    setIsAddressConfirmed(true);
  };

  const handleResetAddress = () => {
    setDeliveryAddress("");
    setAddressLat(null);
    setAddressLng(null);
    setNearbyStores([]);
    setIsAddressConfirmed(false);
    setStore("");
    setIsStoreSelected(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Menu principale
          </Button>
          <h1 className="text-3xl font-bold mb-2">Cerca Prezzi</h1>
          <p className="text-muted-foreground">Confronta i prezzi dei prodotti nei supermercati</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Ricerca Prezzi Prodotti</CardTitle>
            <CardDescription>
              {!isAddressConfirmed 
                ? "Inserisci il tuo indirizzo per visualizzare i supermercati di zona"
                : "Seleziona un supermercato e cerca i prezzi dei prodotti"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isAddressConfirmed ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Indirizzo di consegna</Label>
                  <AddressAutocomplete
                    value={deliveryAddress}
                    onSelect={handleAddressSelect}
                    placeholder="Inserisci il tuo indirizzo"
                    required
                  />
                </div>
                <Button 
                  onClick={handleConfirmAddress}
                  disabled={!deliveryAddress || !addressLat || !addressLng}
                  className="w-full"
                >
                  Cerca supermercati di zona
                </Button>
              </div>
            ) : !isStoreSelected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-muted-foreground">Indirizzo</Label>
                    <p className="font-medium text-sm">{deliveryAddress}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetAddress}
                  >
                    Cambia
                  </Button>
                </div>
                
                {nearbyStores.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="store">Supermercato ({nearbyStores.length} disponibili)</Label>
                    <Select value={store} onValueChange={(value) => {
                      setStore(value);
                      setIsStoreSelected(true);
                    }}>
                      <SelectTrigger id="store">
                        <SelectValue placeholder="Seleziona un supermercato" />
                      </SelectTrigger>
                      <SelectContent>
                        {nearbyStores.map((s) => (
                          <SelectItem key={s.address} value={`${s.name} - ${s.address}`}>
                            {s.name} - {s.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">Nessun supermercato trovato entro 10 km dal tuo indirizzo.</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleResetAddress}
                      className="mt-4"
                    >
                      Prova con un altro indirizzo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Indirizzo</Label>
                      <p className="font-medium text-sm">{deliveryAddress}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleResetAddress}
                    >
                      Cambia
                    </Button>
                  </div>
                  
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
