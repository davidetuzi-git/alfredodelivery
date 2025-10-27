import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Store {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface SupermarketMapProps {
  onSelectStore: (storeName: string) => void;
  deliveryAddress: string;
}

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
  { name: "Coop", address: "Via Bergamo 125, Bergamo", lat: 45.6983, lng: 9.6773 },
  { name: "Lidl", address: "Via Milano 78, Como", lat: 45.8081, lng: 9.0852 },
  
  // Torino e Piemonte
  { name: "Carrefour", address: "Via Livorno 60, Torino", lat: 45.0703, lng: 7.6869 },
  { name: "Esselunga", address: "Corso Sebastopoli 150, Torino", lat: 45.0351, lng: 7.6533 },
  { name: "Coop", address: "Via Nizza 262, Torino", lat: 45.0415, lng: 7.6696 },
  { name: "Conad", address: "Corso Cavour 23, Asti", lat: 44.9008, lng: 8.2067 },
  { name: "Lidl", address: "Via Torino 156, Cuneo", lat: 44.3914, lng: 7.5512 },
  
  // Napoli e Campania
  { name: "Carrefour", address: "Via Argine 380, Napoli", lat: 40.8646, lng: 14.3054 },
  { name: "Coop", address: "Via Galileo Ferraris 148, Napoli", lat: 40.8551, lng: 14.2820 },
  { name: "Lidl", address: "Via Ferrante Imparato 200, Napoli", lat: 40.8734, lng: 14.2463 },
  { name: "Conad", address: "Via Roma 134, Salerno", lat: 40.6824, lng: 14.7681 },
  { name: "Eurospin", address: "Via Nazionale 89, Caserta", lat: 41.0732, lng: 14.3357 },
  { name: "Todis", address: "Corso Umberto I 67, Benevento", lat: 41.1297, lng: 14.7817 },
  
  // Firenze e Toscana
  { name: "Esselunga", address: "Via Pisana 130, Firenze", lat: 43.7696, lng: 11.2268 },
  { name: "Coop", address: "Via Faentina 210, Firenze", lat: 43.8014, lng: 11.3086 },
  { name: "Carrefour", address: "Viale Europa 175, Firenze", lat: 43.7583, lng: 11.2086 },
  { name: "Conad", address: "Via Aurelia Nord 156, Pisa", lat: 43.7228, lng: 10.4017 },
  { name: "Coop", address: "Via Senese 195, Siena", lat: 43.3188, lng: 11.3308 },
  { name: "Lidl", address: "Via Provinciale 234, Lucca", lat: 43.8430, lng: 10.5079 },
  { name: "Esselunga", address: "Via Pistoiese 567, Prato", lat: 43.8777, lng: 11.0955 },
  
  // Bologna e Emilia-Romagna
  { name: "Conad", address: "Via Emilia Ponente 74, Bologna", lat: 44.4899, lng: 11.2954 },
  { name: "Coop", address: "Via Marconi 25, Bologna", lat: 44.4899, lng: 11.3426 },
  { name: "Esselunga", address: "Via Marco Polo 1, Bologna", lat: 44.5067, lng: 11.3449 },
  { name: "Conad", address: "Via Emilia 278, Modena", lat: 44.6471, lng: 10.9252 },
  { name: "Coop", address: "Via Roma 123, Parma", lat: 44.8015, lng: 10.3279 },
  { name: "Lidl", address: "Via Flaminia 234, Rimini", lat: 44.0678, lng: 12.5695 },
  { name: "Conad", address: "Viale Carducci 89, Cesena", lat: 44.1395, lng: 12.2433 },
  
  // Sicilia
  { name: "Carrefour", address: "Via Empedocle Restivo 408, Palermo", lat: 38.1418, lng: 13.3405 },
  { name: "Lidl", address: "Via Ugo La Malfa 103, Palermo", lat: 38.1656, lng: 13.3464 },
  { name: "Lidl", address: "Via Passo Gravina 197, Catania", lat: 37.5135, lng: 15.0867 },
  { name: "Carrefour", address: "Via Vincenzo Giuffrida 23, Catania", lat: 37.5165, lng: 15.0840 },
  { name: "Conad", address: "Via Vittorio Emanuele 234, Messina", lat: 38.1938, lng: 15.5540 },
  { name: "Eurospin", address: "Via Archimede 67, Siracusa", lat: 37.0755, lng: 15.2866 },
  { name: "Todis", address: "Corso Italia 178, Ragusa", lat: 36.9267, lng: 14.7256 },
  
  // Veneto
  { name: "Conad", address: "Via Triestina 172, Mestre", lat: 45.4894, lng: 12.2784 },
  { name: "Lidl", address: "Via Torino 147, Mestre", lat: 45.4867, lng: 12.2437 },
  { name: "Esselunga", address: "Viale del Lavoro 12, Verona", lat: 45.4114, lng: 10.9787 },
  { name: "Pam", address: "Via Sommacampagna 63, Verona", lat: 45.4542, lng: 10.9392 },
  { name: "Coop", address: "Via Roma 89, Padova", lat: 45.4064, lng: 11.8768 },
  { name: "Conad", address: "Viale Italia 234, Vicenza", lat: 45.5455, lng: 11.5354 },
  { name: "Lidl", address: "Via Feltrina 156, Treviso", lat: 45.6669, lng: 12.2430 },
  
  // Puglia
  { name: "Carrefour", address: "Via Melo 222, Bari", lat: 41.1177, lng: 16.8718 },
  { name: "Lidl", address: "Via Giulio Petroni 85, Bari", lat: 41.1179, lng: 16.8825 },
  { name: "Conad", address: "Via Lecce 134, Brindisi", lat: 40.6383, lng: 17.9464 },
  { name: "Eurospin", address: "Via Appia 267, Taranto", lat: 40.4762, lng: 17.2403 },
  { name: "Coop", address: "Viale Gallipoli 89, Lecce", lat: 40.3515, lng: 18.1750 },
  
  // Liguria
  { name: "Esselunga", address: "Via Giotto 36, Genova", lat: 44.4283, lng: 8.9265 },
  { name: "Coop", address: "Via Piacenza 4, Genova", lat: 44.4169, lng: 8.9326 },
  { name: "Conad", address: "Via Aurelia 234, Sanremo", lat: 43.8177, lng: 7.7743 },
  { name: "Lidl", address: "Via Nazionale 145, La Spezia", lat: 44.1024, lng: 9.8247 },
  
  // Sardegna
  { name: "Conad", address: "Via Cagliari 156, Cagliari", lat: 39.2238, lng: 9.1217 },
  { name: "Eurospin", address: "Viale Trieste 89, Sassari", lat: 40.7259, lng: 8.5599 },
  { name: "Coop", address: "Via Italia 234, Olbia", lat: 40.9237, lng: 9.4967 },
  
  // Marche
  { name: "Conad", address: "Via Flaminia 123, Ancona", lat: 43.6158, lng: 13.5189 },
  { name: "Coop", address: "Viale Repubblica 67, Pesaro", lat: 43.9093, lng: 12.9133 },
  { name: "Lidl", address: "Via Roma 234, Macerata", lat: 43.2983, lng: 13.4533 },
  
  // Umbria
  { name: "Coop", address: "Via Cortonese 45, Perugia", lat: 43.1107, lng: 12.3908 },
  { name: "Conad", address: "Viale Trento 89, Terni", lat: 42.5634, lng: 12.6475 },
  
  // Calabria
  { name: "Conad", address: "Via Popilia 234, Cosenza", lat: 39.3098, lng: 16.2543 },
  { name: "Eurospin", address: "Corso Mazzini 156, Catanzaro", lat: 38.9098, lng: 16.5877 },
  { name: "Lidl", address: "Via Nazionale 189, Reggio Calabria", lat: 38.1080, lng: 15.6435 },
  
  // Friuli-Venezia Giulia
  { name: "Coop", address: "Via Cividale 234, Udine", lat: 46.0621, lng: 13.2346 },
  { name: "Lidl", address: "Corso Italia 156, Trieste", lat: 45.6495, lng: 13.7768 },
  
  // Trentino-Alto Adige
  { name: "Coop", address: "Via Brennero 234, Trento", lat: 46.0664, lng: 11.1257 },
  { name: "Conad", address: "Via Roma 89, Bolzano", lat: 46.4983, lng: 11.3548 },
];

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const SupermarketMap = ({ onSelectStore, deliveryAddress }: SupermarketMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([41.9028, 12.4964]);
  const [addressLocation, setAddressLocation] = useState<[number, number] | null>(null);
  const [filteredStores, setFilteredStores] = useState<Store[]>(stores);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedStoreCoords, setSelectedStoreCoords] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<'zone1' | 'zone2' | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  }, []);

  // Fetch real stores from OpenStreetMap Overpass API
  const fetchNearbyStores = async (lat: number, lng: number) => {
    setIsLoadingStores(true);
    try {
      // Search radius in meters (10km for better coverage)
      const radius = 10000;
      
      // Overpass query to find all types of food retail stores
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"="supermarket"](around:${radius},${lat},${lng});
          way["shop"="supermarket"](around:${radius},${lat},${lng});
          relation["shop"="supermarket"](around:${radius},${lat},${lng});
          
          node["shop"="convenience"](around:${radius},${lat},${lng});
          way["shop"="convenience"](around:${radius},${lat},${lng});
          
          node["shop"="grocery"](around:${radius},${lat},${lng});
          way["shop"="grocery"](around:${radius},${lat},${lng});
          
          node["shop"="greengrocer"](around:${radius},${lat},${lng});
          way["shop"="greengrocer"](around:${radius},${lat},${lng});
          
          node["shop"="general"](around:${radius},${lat},${lng});
          way["shop"="general"](around:${radius},${lat},${lng});
          
          node["shop"="department_store"]["name"~"Esselunga|Coop|Conad|Carrefour|Lidl|Eurospin|MD|Todis|Pam|Tigre|Iper|Simply|Unes|Il Gigante|Penny|Aldi"](around:${radius},${lat},${lng});
          way["shop"="department_store"]["name"~"Esselunga|Coop|Conad|Carrefour|Lidl|Eurospin|MD|Todis|Pam|Tigre|Iper|Simply|Unes|Il Gigante|Penny|Aldi"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });

      const data = await response.json();
      
      let realStores: Store[] = [];
      
      if (data.elements && data.elements.length > 0) {
        realStores = data.elements.map((element: any) => {
          const storeLat = element.lat || element.center?.lat;
          const storeLng = element.lon || element.center?.lon;
          const name = element.tags?.name || element.tags?.brand || element.tags?.operator || 'Supermercato';
          const street = element.tags?.['addr:street'] || '';
          const houseNumber = element.tags?.['addr:housenumber'] || '';
          const city = element.tags?.['addr:city'] || '';
          
          let address = '';
          if (street) address += street;
          if (houseNumber) address += ` ${houseNumber}`;
          if (city) address += `, ${city}`;
          if (!address) address = 'Indirizzo non disponibile';

          return {
            name,
            address,
            lat: storeLat,
            lng: storeLng,
          };
        }).filter((store: Store) => store.lat && store.lng);
      }

      // Always include hardcoded stores in the area
      const hardcodedNearby = stores.filter(store => {
        const distance = calculateDistance(lat, lng, store.lat, store.lng);
        return distance <= 10;
      });

      // Merge real and hardcoded stores
      const allStores = [...realStores, ...hardcodedNearby];
      
      // Deduplicate based on proximity (stores within 50m are considered the same)
      const uniqueStores = allStores.reduce((acc: Store[], store) => {
        const isDuplicate = acc.some(s => 
          calculateDistance(s.lat, s.lng, store.lat, store.lng) < 0.05 // ~50 meters
        );
        if (!isDuplicate) {
          acc.push(store);
        }
        return acc;
      }, []);

      console.log(`Found ${realStores.length} real stores from API and ${hardcodedNearby.length} hardcoded stores. Total unique: ${uniqueStores.length}`);
      
      setFilteredStores(uniqueStores);
    } catch (error) {
      console.error("Error fetching stores from Overpass API:", error);
      // Fallback to hardcoded stores
      const nearby = stores.filter(store => {
        const distance = calculateDistance(lat, lng, store.lat, store.lng);
        return distance <= 10;
      });
      setFilteredStores(nearby);
    } finally {
      setIsLoadingStores(false);
    }
  };

  useEffect(() => {
    const geocodeAddress = async () => {
      if (!deliveryAddress.trim()) {
        setFilteredStores(stores);
        setAddressLocation(null);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(deliveryAddress)}&countrycodes=it&addressdetails=1&limit=10`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setAddressLocation([lat, lng]);

          // Fetch real stores from OpenStreetMap
          await fetchNearbyStores(lat, lng);
        } else {
          setFilteredStores(stores);
          setAddressLocation(null);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        setFilteredStores(stores);
        setAddressLocation(null);
      }
    };

    const timeoutId = setTimeout(geocodeAddress, 1500);
    return () => clearTimeout(timeoutId);
  }, [deliveryAddress]);

  const fetchRoute = async (from: [number, number], to: [number, number]) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRoute(route.geometry);
        setRouteDistance((route.distance / 1000).toFixed(1)); // Convert to km
        setRouteDuration(Math.ceil(route.duration / 60)); // Convert to minutes
        
        // Draw route on map
        if (mapRef.current && routeLayerRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current);
        }
        
        if (mapRef.current) {
          const routeCoords = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
          const polyline = L.polyline(routeCoords, {
            color: '#22c55e',
            weight: 4,
            opacity: 0.7
          }).addTo(mapRef.current);
          
          routeLayerRef.current = polyline;
          
          // Fit map to route
          mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const DefaultIcon = L.icon({
      iconUrl: icon,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    const DeliveryIcon = L.icon({
      iconUrl: icon,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      className: 'hue-rotate-[240deg] saturate-150'
    });

    const center = addressLocation || userLocation;
    
    if (mapRef.current) {
      mapRef.current.setView(center, 14, { animate: true });
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle) {
          mapRef.current?.removeLayer(layer);
        }
      });
    } else {
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: true,
        dragging: true,
        tap: true,
        touchZoom: true
      }).setView(center, 14);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    }

    if (addressLocation && mapRef.current) {
      // Zona 1: 0-7km (verde)
      L.circle(addressLocation, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.1,
        radius: 7000,
        weight: 2
      }).addTo(mapRef.current);

      // Zona 2: 7-10km (arancione)
      L.circle(addressLocation, {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        radius: 10000,
        weight: 2
      }).addTo(mapRef.current);

      L.marker(addressLocation, { icon: DeliveryIcon })
        .addTo(mapRef.current)
        .bindPopup('📍 Indirizzo di consegna');
    }

    filteredStores.forEach((store) => {
      if (!mapRef.current) return;
      const marker = L.marker([store.lat, store.lng], { icon: DefaultIcon }).addTo(mapRef.current);
      
      let popupContent = `<div class="text-center p-2">
        <strong class="text-base">${store.name}</strong><br/>
        <span class="text-sm text-gray-600">${store.address}</span>`;
      
      if (addressLocation) {
        const dist = calculateDistance(addressLocation[0], addressLocation[1], store.lat, store.lng);
        popupContent += `<br/><small class="text-gray-500">${dist.toFixed(1)} km di distanza</small>`;
      }
      
      popupContent += `<br/><br/>
        <button 
          onclick="window.selectStore('${store.name.replace(/'/g, "\\'")} - ${store.address.replace(/'/g, "\\'")}', ${store.lat}, ${store.lng})"
          class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-sm cursor-pointer"
        >
          Seleziona questo negozio
        </button>
      </div>`;
      
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'store-popup'
      });
    });

    // Add global function for store selection
    (window as any).selectStore = (storeName: string, lat: number, lng: number) => {
      setSelectedStoreCoords([lat, lng]);
      
      // Calculate distance and determine zone
      if (addressLocation) {
        const distance = calculateDistance(addressLocation[0], addressLocation[1], lat, lng);
        const zone = distance <= 7 ? 'zone1' : 'zone2';
        setDeliveryZone(zone);
        
        // Fetch route
        fetchRoute(addressLocation, [lat, lng]);
      }
      
      setSelectedStore(storeName);
    };

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLocation, addressLocation, filteredStores, onSelectStore]);

  return (
    <>
      <AlertDialog open={selectedStore !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedStore(null);
          setDeliveryZone(null);
          setSelectedStoreCoords(null);
        }
      }}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma selezione</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi utilizzare questo supermercato?
              <br /><br />
              <strong>{selectedStore}</strong>
              <br /><br />
              {deliveryZone && addressLocation && selectedStoreCoords && (
                <div className={`p-3 rounded-md ${deliveryZone === 'zone1' ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800'}`}>
                  <p className={`text-sm font-semibold mb-2 ${deliveryZone === 'zone1' ? 'text-green-900 dark:text-green-100' : 'text-orange-900 dark:text-orange-100'}`}>
                    {deliveryZone === 'zone1' ? '🟢 Zona 1 (0-7km)' : '🟠 Zona 2 (7-10km)'}
                  </p>
                  <p className={`text-xs ${deliveryZone === 'zone1' ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}`}>
                    <strong>Costi di servizio:</strong>
                    <br />
                    • {deliveryZone === 'zone1' ? '0,15€' : '0,17€'} per prodotto × quantità
                    <br />
                    • Fee consegna: {deliveryZone === 'zone1' ? '10€' : '15€'} (spesa &lt; 50€) o {deliveryZone === 'zone1' ? '8€' : '12€'} (spesa ≥ 50€)
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (selectedStore) {
                onSelectStore(selectedStore);
                setSelectedStore(null);
                setDeliveryZone(null);
                setSelectedStoreCoords(null);
              }
            }}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-2">
        <div 
          ref={mapContainerRef} 
          className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative"
        >
          {isLoadingStores && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Caricamento negozi...</p>
              </div>
            </div>
          )}
        </div>
        {routeDistance && routeDuration && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm">
            <p className="text-green-900 dark:text-green-100">
              <strong>Percorso calcolato:</strong> {routeDistance} km - Tempo stimato consegna: ~{routeDuration} minuti
            </p>
          </div>
        )}
        {deliveryAddress && filteredStores.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              📍 {filteredStores.length} negozi trovati entro 10km dall'indirizzo
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-2">
                <p className="font-semibold text-green-900 dark:text-green-100">🟢 Zona 1 (0-7km)</p>
                <p className="text-green-800 dark:text-green-200 mt-1">
                  0,15€/prodotto + 10€ fee (&lt;50€) o 8€ (≥50€)
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-2">
                <p className="font-semibold text-orange-900 dark:text-orange-100">🟠 Zona 2 (7-10km)</p>
                <p className="text-orange-800 dark:text-orange-200 mt-1">
                  0,17€/prodotto + 15€ fee (&lt;50€) o 12€ (≥50€)
                </p>
              </div>
            </div>
          </div>
        )}
        {deliveryAddress && filteredStores.length === 0 && !isLoadingStores && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Nessun supermercato trovato entro 10km dall'indirizzo specificato
          </p>
        )}
      </div>
    </>
  );
};

export default SupermarketMap;
