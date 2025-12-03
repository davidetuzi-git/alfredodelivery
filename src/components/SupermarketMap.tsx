import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  { name: "Eurospin", address: "Via Prenestina 409, Roma", lat: 41.8900, lng: 12.5509 },
  { name: "MD Discount", address: "Via Tiburtina 1011, Roma", lat: 41.9129, lng: 12.5734 },
  { name: "Pam", address: "Via Cola di Rienzo 173, Roma", lat: 41.9065, lng: 12.4652 },
  { name: "Todis", address: "Via Nomentana 559, Roma", lat: 41.9254, lng: 12.5234 },
  { name: "Iper", address: "Via Palmiro Togliatti 2, Roma", lat: 41.8760, lng: 12.5651 },
  { name: "Carrefour", address: "Viale Marconi 358, Roma", lat: 41.8625, lng: 12.4690 },
  { name: "Coop", address: "Via di Torre Spaccata 159, Roma", lat: 41.8735, lng: 12.5925 },
  { name: "Tigre", address: "Via Ostiense 260, Roma", lat: 41.8564, lng: 12.4787 },
  
  // Anzio e Nettuno (zona densamente popolata)
  { name: "Conad", address: "Via Nettunense 255, Anzio", lat: 41.4497, lng: 12.6293 },
  { name: "Lidl", address: "Via Ardeatina 574, Anzio", lat: 41.4521, lng: 12.6187 },
  { name: "MD Discount", address: "Via di Villa Claudia 90, Anzio", lat: 41.4535, lng: 12.6251 },
  { name: "Eurospin", address: "Viale Nerone 45, Anzio", lat: 41.4632, lng: 12.6241 },
  { name: "Conad", address: "Viale Antium 4, Anzio", lat: 41.4626, lng: 12.6286 },
  { name: "Pam", address: "Via Santa Barbara 180, Nettuno", lat: 41.4601, lng: 12.6512 },
  { name: "Carrefour", address: "Via Traunreut 40, Nettuno", lat: 41.4558, lng: 12.6775 },
  { name: "Tigre", address: "Via Roma 67, Anzio", lat: 41.4517, lng: 12.6241 },
  { name: "Tigre", address: "Via Matteotti 155, Anzio", lat: 41.4477, lng: 12.6277 },
  { name: "Buccolini", address: "Via Ardeatina 456, Anzio", lat: 41.4463, lng: 12.6278 },
  { name: "Decò", address: "Via Nettunense 422, Lavinio", lat: 41.5003, lng: 12.6212 },
  { name: "In Grande", address: "Via Nettunense 460, Lavinio", lat: 41.5027, lng: 12.6259 },
  { name: "Conad Superstore", address: "Via Nettunense 380, Lavinio", lat: 41.5015, lng: 12.6272 },
  { name: "In's Mercato", address: "Via degli Eroi 25, Lavinio", lat: 41.5079, lng: 12.5839 },
  { name: "In's Mercato", address: "Via Nettunense 315, Aprilia", lat: 41.5897, lng: 12.6512 },
  { name: "In's", address: "Via delle Rose 78, Ardea", lat: 41.6134, lng: 12.5489 },
  { name: "Conad", address: "Via Diaz 8, Nettuno", lat: 41.4629, lng: 12.6593 },
  { name: "Eurospin", address: "Via Santa Maria 112, Nettuno", lat: 41.4645, lng: 12.6717 },
  { name: "Conad", address: "Via Nettunense 320, Nettuno", lat: 41.4642, lng: 12.6709 },
  { name: "Lidl", address: "Via Santa Barbara 95, Nettuno", lat: 41.4600, lng: 12.6511 },
  { name: "Alimentari Teori", address: "Via Nettuno-Velletri 208, Nettuno", lat: 41.5037, lng: 12.6876 },
  { name: "Panorama", address: "Via Giacomo Matteotti 35, Nettuno", lat: 41.4639, lng: 12.6628 },
  { name: "Conad", address: "Via del Mare 89, Nettuno", lat: 41.4574, lng: 12.6576 },
  
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

// Fix default marker icons
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const RedIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjZWY0NDQ0IiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguMiAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIwLjcgMjUgMTIuNUMyNSA1LjYgMTkuNCAwIDEyLjUgMHptMCAxN2MtMi41IDAtNC41LTItNC41LTQuNXMyLTQuNSA0LjUtNC41IDQuNSAyIDQuNSA0LjUtMiA0LjUtNC41IDQuNXoiLz48L3N2Zz4=',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

const SupermarketMap: React.FC<SupermarketMapProps> = ({ onSelectStore, deliveryAddress, onStoresUpdate }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const routeRef = useRef<L.Polyline | null>(null);
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [addressLocation, setAddressLocation] = useState<[number, number] | null>(null);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [storeTypeFilter, setStoreTypeFilter] = useState<string>("all");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<L.Marker | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

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
    setIsLoadingStores(true);
    try {
      const radius = 10000;
      const query = `
        [out:json][timeout:30];
        (
          node["shop"="supermarket"](around:${radius},${lat},${lng});
          way["shop"="supermarket"](around:${radius},${lat},${lng});
          node["shop"="convenience"](around:${radius},${lat},${lng});
          way["shop"="convenience"](around:${radius},${lat},${lng});
        );
        out center 200;
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
    } finally {
      setIsLoadingStores(false);
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

  // Fetch route from OSRM
  const fetchRoute = async (storeLocation: [number, number]) => {
    if (!addressLocation) return;

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${storeLocation[1]},${storeLocation[0]};${addressLocation[1]},${addressLocation[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        
        // Remove old route
        if (routeRef.current) {
          routeRef.current.remove();
        }

        // Add new route
        if (mapRef.current) {
          routeRef.current = L.polyline(coords, {
            color: '#ef4444',
            weight: 4,
            opacity: 0.7,
          }).addTo(mapRef.current);

          // Fit bounds to show entire route
          mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [50, 50] });
        }

        // Set distance and duration
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration / 60;
        setRouteDistance(distanceKm);
        setRouteDuration(durationMin);


        // Calculate delivery fee based on distance
        // Note: Actual fee depends on order total, but we show base rate here
        // Zona 1 (0-7km): €10 for <€50, €8 for ≥€50
        // Zona 2 (7-10km): €15 for <€50, €12 for ≥€50
        // Zona 3 (>10km): €20
        if (distanceKm <= 7) {
          setDeliveryFee(10); // Base rate for Zona 1
        } else if (distanceKm <= 10) {
          setDeliveryFee(15); // Base rate for Zona 2
        } else {
          setDeliveryFee(20); // Base rate for Zona 3
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const center: [number, number] = addressLocation || userLocation || [41.9028, 12.4964];
    // Zoom 12 shows approximately 10km radius nicely
    const initialZoom = addressLocation ? 12 : 11;

    if (!mapRef.current) {
      // Create map
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: initialZoom,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
    } else {
      // Update center and zoom to show 10km area
      mapRef.current.setView(center, initialZoom);
    }

    // Clear existing markers and circles
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    circlesRef.current.forEach(circle => circle.remove());
    circlesRef.current = [];

    // Add delivery zones (7km and 10km circles)
    if (addressLocation && mapRef.current) {
      // 7km zone - green
      const circle7km = L.circle(addressLocation, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.1,
        radius: 7000,
        weight: 2,
      }).addTo(mapRef.current);
      circle7km.bindPopup('Zona di consegna 7 km');
      circlesRef.current.push(circle7km);

      // 10km zone - blue
      const circle10km = L.circle(addressLocation, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.05,
        radius: 10000,
        weight: 2,
      }).addTo(mapRef.current);
      circle10km.bindPopup('Zona di consegna 10 km');
      circlesRef.current.push(circle10km);
    }

    // Add delivery address marker (red)
    if (addressLocation && mapRef.current) {
      const marker = L.marker(addressLocation, { icon: RedIcon }).addTo(mapRef.current);
      marker.bindPopup(`<strong>Indirizzo di consegna</strong><br/>${deliveryAddress}`);
      markersRef.current.push(marker);
    }

    // Add store markers
    if (mapRef.current) {
      filteredStores.forEach((store, index) => {
        const marker = L.marker([store.lat, store.lng]).addTo(mapRef.current!);
        
        const popupContent = document.createElement('div');
        popupContent.className = 'text-sm p-2';
        popupContent.innerHTML = `
          <strong class="block mb-1">${store.name}</strong>
          <span class="block mb-2 text-muted-foreground">${store.address}</span>
        `;
        
        const button = document.createElement('button');
        button.textContent = 'Seleziona';
        button.className = 'mt-2 px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer w-full';
        button.style.zIndex = '9999';
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Close the popup first
          marker.closePopup();
          
          // Reset previous selected marker
          if (selectedMarker) {
            selectedMarker.setIcon(DefaultIcon);
          }
          
          // Set new selected marker to red
          marker.setIcon(RedIcon);
          setSelectedMarker(marker);
          
          fetchRoute([store.lat, store.lng]);
          setSelectedStore(store);
          setShowConfirmDialog(true);
        };
        
        popupContent.appendChild(button);
        
        marker.bindPopup(popupContent, { 
          className: 'custom-popup',
          closeButton: true,
          autoClose: false,
        });
        markersRef.current.push(marker);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [addressLocation, userLocation, filteredStores, deliveryAddress]);


  const handleConfirmStore = () => {
    if (selectedStore) {
      onSelectStore(selectedStore.name, selectedStore.address);
      setShowConfirmDialog(false);
      
      // Close all popups
      if (mapRef.current) {
        mapRef.current.closePopup();
      }
    }
  };

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

      <div 
        ref={mapContainerRef}
        className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg relative"
        style={{ zIndex: 1 }}
      >
        {isLoadingStores && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm font-medium">Ricerca supermercati...</p>
              <p className="text-xs text-muted-foreground">Caricamento dei marker sulla mappa</p>
            </div>
          </div>
        )}
        
        {/* Route info overlay - positioned bottom-left to avoid route and pins */}
        {routeDistance !== null && selectedStore && (
          <div className="absolute bottom-16 left-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-border/50 p-2 z-[1000] animate-in slide-in-from-left-2 duration-300 max-w-[200px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs leading-tight truncate">{selectedStore.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{selectedStore.address}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-center">
              <div className="flex-1">
                <p className="text-sm font-bold text-primary">{routeDistance.toFixed(1)}</p>
                <p className="text-[8px] text-muted-foreground uppercase">KM</p>
              </div>
              <div className="w-px h-6 bg-border/50"></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-primary">{routeDuration ? Math.round(routeDuration) : '-'}</p>
                <p className="text-[8px] text-muted-foreground uppercase">MIN</p>
              </div>
              <div className="w-px h-6 bg-border/50"></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-600">€{deliveryFee}</p>
                <p className="text-[8px] text-muted-foreground uppercase">CONS.</p>
              </div>
            </div>
            
            <div className="mt-2 pt-1 border-t border-border/30">
              <p className="text-[8px] text-muted-foreground text-center">
                {routeDistance <= 7 
                  ? '📍 Zona 1 • Standard' 
                  : routeDistance <= 10 
                    ? '📍 Zona 2 • Estesa' 
                    : '📍 Zona 3 • Lontana'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {!isLoadingStores && filteredStores.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {filteredStores.length} {filteredStores.length === 1 ? 'negozio trovato' : 'negozi trovati'} nel raggio di 10km
        </p>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Informazioni supermercato selezionato</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <div>
                  <p className="font-semibold text-foreground">{selectedStore?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStore?.address}</p>
                </div>
                
                {routeDistance !== null && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm">Distanza:</span>
                      <span className="text-sm font-medium">{routeDistance.toFixed(2)} km</span>
                    </div>
                    {routeDuration !== null && (
                      <div className="flex justify-between">
                        <span className="text-sm">Tempo stimato:</span>
                        <span className="text-sm font-medium">{Math.round(routeDuration)} min</span>
                      </div>
                    )}
                    {deliveryFee !== null && (
                      <div className="flex justify-between">
                        <span className="text-sm">Costo consegna base:</span>
                        <span className="text-sm font-medium text-primary">
                          €{deliveryFee.toFixed(2)}
                          {routeDistance && routeDistance <= 7 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (€8 con spesa ≥€50)
                            </span>
                          )}
                          {routeDistance && routeDistance > 7 && routeDistance <= 10 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (€12 con spesa ≥€50)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStore}>
              Conferma selezione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {routeDistance !== null && routeDuration !== null && (
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Informazioni percorso</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Distanza:</span>
              <span className="ml-2 font-medium">{routeDistance.toFixed(2)} km</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tempo stimato:</span>
              <span className="ml-2 font-medium">{Math.round(routeDuration)} min</span>
            </div>
            {deliveryFee !== null && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Tariffa consegna:</span>
                <span className="ml-2 font-medium text-primary">€{deliveryFee.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-card p-4 rounded-lg border">
        <h3 className="font-semibold mb-3">Tariffe di consegna</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 rounded bg-green-500/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Zona 0-7 km</span>
            </div>
            <span className="font-semibold">€8-10</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-blue-500/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Zona 7-10 km</span>
            </div>
            <span className="font-semibold">€12-15</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * €8 o €12 per spese ≥€50, altrimenti €10 o €15
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupermarketMap;
