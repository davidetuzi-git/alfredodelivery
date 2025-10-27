import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Fix default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Store {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface SupermarketMapProps {
  onSelectStore: (storeName: string, storeAddress?: string) => void;
  deliveryAddress: string;
  onStoresUpdate?: (stores: Store[]) => void;
}

// Static store data
export const stores: Store[] = [
  // Roma e Provincia
  { name: "Esselunga", address: "Via Tuscolana 123, Roma", lat: 41.8719, lng: 12.5144 },
  { name: "Carrefour Express", address: "Via Appia Nuova 45, Roma", lat: 41.8769, lng: 12.5186 },
  { name: "Coop", address: "Via dei Castani 67, Roma", lat: 41.8689, lng: 12.5204 },
  { name: "Conad", address: "Viale Manzoni 89, Roma", lat: 41.8929, lng: 12.5014 },
  { name: "Lidl", address: "Via Casilina 234, Roma", lat: 41.8799, lng: 12.5456 },
  { name: "Conad", address: "Via Nettunense 255, Anzio", lat: 41.4497, lng: 12.6293 },
  { name: "Lidl", address: "Via Ardeatina 574, Anzio", lat: 41.4521, lng: 12.6187 },
  { name: "MD Discount", address: "Via di Villa Claudia 90, Anzio", lat: 41.4535, lng: 12.6251 },
  
  // Abruzzo
  { name: "Conad", address: "Via Monte Velino 15, Avezzano", lat: 42.0371, lng: 13.4219 },
  { name: "Eurospin", address: "Via Corradini 34, Avezzano", lat: 42.0301, lng: 13.4268 },
  { name: "Tigre", address: "Via Tiburtina Valeria 168, Avezzano", lat: 42.0329, lng: 13.4357 },
  { name: "Coop", address: "Corso della Libertà 47, Pescara", lat: 42.4618, lng: 14.2144 },
  { name: "Eurospin", address: "Via Tiburtina 429, Pescara", lat: 42.4534, lng: 14.2089 },
  { name: "Lidl", address: "Via Lago di Campotosto 1, L'Aquila", lat: 42.3498, lng: 13.3995 },
  { name: "Conad", address: "Via Strinella 50, L'Aquila", lat: 42.3621, lng: 13.3876 },
  { name: "Coop", address: "Via Nazionale 45, Teramo", lat: 42.6589, lng: 13.7044 },
  
  // Milano e Lombardia
  { name: "Esselunga", address: "Viale Piave 10, Milano", lat: 45.4773, lng: 9.2058 },
  { name: "Carrefour", address: "Via Lorenteggio 251, Milano", lat: 45.4515, lng: 9.1371 },
  { name: "Coop", address: "Via Famagosta 75, Milano", lat: 45.4484, lng: 9.1595 },
  { name: "Pam", address: "Corso Buenos Aires 33, Milano", lat: 45.4781, lng: 9.2060 },
  { name: "Esselunga", address: "Via Roma 45, Monza", lat: 45.5845, lng: 9.2744 },
  { name: "Carrefour", address: "Viale Europa 3, Brescia", lat: 45.5416, lng: 10.2118 },
  
  // Napoli e Campania
  { name: "Coop", address: "Via Nazionale delle Puglie 112, Napoli", lat: 40.8656, lng: 14.2814 },
  { name: "Carrefour", address: "Via Argine 380, Napoli", lat: 40.8564, lng: 14.3154 },
  { name: "Lidl", address: "Via Medina 5, Napoli", lat: 40.8380, lng: 14.2503 },
  { name: "Conad", address: "Corso Italia 21, Sorrento", lat: 40.6262, lng: 14.3757 },
  { name: "Eurospin", address: "Via Roma 142, Salerno", lat: 40.6824, lng: 14.7681 },
  
  // Torino e Piemonte
  { name: "Esselunga", address: "Corso Francia 235, Torino", lat: 45.0983, lng: 7.6632 },
  { name: "Carrefour", address: "Via Livorno 60, Torino", lat: 45.0536, lng: 7.6598 },
  { name: "Coop", address: "Corso Vittorio Emanuele II 68, Torino", lat: 45.0677, lng: 7.6824 },
  
  // Firenze e Toscana
  { name: "Esselunga", address: "Viale De Amicis 89, Firenze", lat: 43.7696, lng: 11.2558 },
  { name: "Coop", address: "Via Guido Monaco 35, Firenze", lat: 43.7731, lng: 11.2522 },
  { name: "Conad", address: "Via Aretina 200, Firenze", lat: 43.7566, lng: 11.2991 },
  
  // Bologna e Emilia-Romagna
  { name: "Coop", address: "Via Massarenti 172, Bologna", lat: 44.5013, lng: 11.3632 },
  { name: "Conad", address: "Via Emilia Ponente 145, Bologna", lat: 44.4949, lng: 11.2865 },
  { name: "Esselunga", address: "Via Marco Polo 1, Bologna", lat: 44.4979, lng: 11.3514 },
  
  // Venezia e Veneto
  { name: "Coop", address: "Via Torino 177, Mestre", lat: 45.4842, lng: 12.2434 },
  { name: "Lidl", address: "Via Fratelli Bandiera 30, Mestre", lat: 45.4863, lng: 12.2376 },
  { name: "Eurospin", address: "Via Poerio 34, Verona", lat: 45.4299, lng: 10.9916 },
  
  // Palermo e Sicilia
  { name: "Carrefour", address: "Via Lazio 50, Palermo", lat: 38.1157, lng: 13.3615 },
  { name: "Eurospin", address: "Via Strasburgo 312, Palermo", lat: 38.1613, lng: 13.3409 },
  { name: "Coop", address: "Corso dei Mille 1420, Catania", lat: 37.5079, lng: 15.0830 },
  
  // Genova e Liguria
  { name: "Coop", address: "Via Gramsci 13, Genova", lat: 44.4056, lng: 8.9463 },
  { name: "Esselunga", address: "Via XX Settembre 155, Genova", lat: 44.4104, lng: 8.9395 },
  
  // Bari e Puglia
  { name: "Carrefour Express", address: "Via Sparano 89, Bari", lat: 41.1171, lng: 16.8719 },
  { name: "Lidl", address: "Via Omodeo 102, Bari", lat: 41.1089, lng: 16.8527 },
  { name: "Dok", address: "Via Amendola 203, Bari", lat: 41.1104, lng: 16.8821 },
];

// Utility function to calculate distance
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Component to update map center
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

const SupermarketMap: React.FC<SupermarketMapProps> = ({ onSelectStore, deliveryAddress, onStoresUpdate }) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [addressLocation, setAddressLocation] = useState<[number, number] | null>(null);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [storeTypeFilter, setStoreTypeFilter] = useState<string>("all");
  const [chainFilter, setChainFilter] = useState<string>("all");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  }, []);

  useEffect(() => {
    if (deliveryAddress) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(deliveryAddress)}&countrycodes=it&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            setAddressLocation([lat, lng]);
            fetchNearbyStores(lat, lng);
          }
        })
        .catch(error => console.error('Geocoding error:', error));
    }
  }, [deliveryAddress]);

  const fetchNearbyStores = async (lat: number, lng: number) => {
    try {
      const radius = 10000;
      const query = `
        [out:json][timeout:15];
        (
          node["shop"="supermarket"](around:${radius},${lat},${lng});
          way["shop"="supermarket"](around:${radius},${lat},${lng});
        );
        out center 50;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      const data = await response.json();
      
      const osmStores: Store[] = data.elements
        .filter((element: any) => {
          const elementLat = element.lat || element.center?.lat;
          const elementLon = element.lon || element.center?.lon;
          return elementLat && elementLon;
        })
        .map((element: any) => ({
          name: element.tags?.name || element.tags?.brand || 'Supermercato',
          address: element.tags?.["addr:street"] 
            ? `${element.tags["addr:street"]}${element.tags["addr:housenumber"] ? ', ' + element.tags["addr:housenumber"] : ''}, ${element.tags["addr:city"] || ''}`
            : 'Indirizzo non disponibile',
          lat: element.lat || element.center.lat,
          lng: element.lon || element.center.lon,
        }));

      const nearbyHardcodedStores = stores.filter(store => {
        const distance = calculateDistance(lat, lng, store.lat, store.lng);
        return distance <= 10;
      });

      const combinedStores = [...osmStores, ...nearbyHardcodedStores];
      const uniqueStores = Array.from(
        new Map(combinedStores.map(store => [`${store.lat}-${store.lng}`, store])).values()
      );

      setAllStores(uniqueStores);
      setFilteredStores(uniqueStores);
      
      if (onStoresUpdate) {
        onStoresUpdate(uniqueStores);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setAllStores(stores);
      setFilteredStores(stores);
    }
  };

  useEffect(() => {
    let filtered = allStores;

    if (storeTypeFilter !== "all") {
      filtered = filtered.filter(store => {
        const storeName = store.name.toLowerCase();
        if (storeTypeFilter === "supermarket") {
          return storeName.includes("coop") || storeName.includes("conad") || 
                 storeName.includes("esselunga") || storeName.includes("carrefour");
        } else if (storeTypeFilter === "discount") {
          return storeName.includes("eurospin") || storeName.includes("lidl") || 
                 storeName.includes("md") || storeName.includes("penny");
        }
        return true;
      });
    }

    if (chainFilter !== "all") {
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(chainFilter.toLowerCase())
      );
    }

    setFilteredStores(filtered);
  }, [storeTypeFilter, chainFilter, allStores]);

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    setShowConfirmDialog(true);
  };

  const handleConfirmStore = () => {
    if (selectedStore) {
      onSelectStore(selectedStore.name, selectedStore.address);
      setShowConfirmDialog(false);
    }
  };

  const center: [number, number] = addressLocation || userLocation || [41.9028, 12.4964];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Tipo di negozio</label>
          <Select value={storeTypeFilter} onValueChange={setStoreTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="supermarket">Supermercati</SelectItem>
              <SelectItem value="discount">Discount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Catena</label>
          <Select value={chainFilter} onValueChange={setChainFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="coop">Coop</SelectItem>
              <SelectItem value="conad">Conad</SelectItem>
              <SelectItem value="esselunga">Esselunga</SelectItem>
              <SelectItem value="carrefour">Carrefour</SelectItem>
              <SelectItem value="eurospin">Eurospin</SelectItem>
              <SelectItem value="lidl">Lidl</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg">
        <MapContainer 
          center={center} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater center={center} />
          
          {addressLocation && (
            <Marker position={addressLocation}>
              <Popup>
                <strong>Indirizzo di consegna</strong><br />
                {deliveryAddress}
              </Popup>
            </Marker>
          )}

          {filteredStores.map((store, index) => (
            <Marker 
              key={`${store.lat}-${store.lng}-${index}`} 
              position={[store.lat, store.lng]}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{store.name}</strong><br />
                  {store.address}<br />
                  <button
                    onClick={() => handleStoreSelect(store)}
                    className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Seleziona
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma selezione negozio</AlertDialogTitle>
            <AlertDialogDescription>
              Hai selezionato <strong>{selectedStore?.name}</strong> in {selectedStore?.address}.
              Vuoi confermare questa scelta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStore}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupermarketMap;
