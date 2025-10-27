import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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

const stores: Store[] = [
  // Roma
  { name: "Esselunga", address: "Via Tuscolana 123, Roma", lat: 41.8719, lng: 12.5144 },
  { name: "Carrefour Express", address: "Via Appia Nuova 45, Roma", lat: 41.8769, lng: 12.5186 },
  { name: "Coop", address: "Via dei Castani 67, Roma", lat: 41.8689, lng: 12.5204 },
  { name: "Conad", address: "Viale Manzoni 89, Roma", lat: 41.8929, lng: 12.5014 },
  { name: "Lidl", address: "Via Casilina 234, Roma", lat: 41.8799, lng: 12.5456 },
  
  // Milano
  { name: "Esselunga", address: "Viale Piave 10, Milano", lat: 45.4773, lng: 9.2058 },
  { name: "Carrefour", address: "Via Lorenteggio 251, Milano", lat: 45.4515, lng: 9.1371 },
  { name: "Coop", address: "Via Famagosta 75, Milano", lat: 45.4484, lng: 9.1595 },
  { name: "Pam", address: "Corso Buenos Aires 33, Milano", lat: 45.4781, lng: 9.2060 },
  { name: "Iper", address: "Via Rubattino 84, Milano", lat: 45.5041, lng: 9.2417 },
  
  // Torino
  { name: "Carrefour", address: "Via Livorno 60, Torino", lat: 45.0703, lng: 7.6869 },
  { name: "Esselunga", address: "Corso Sebastopoli 150, Torino", lat: 45.0351, lng: 7.6533 },
  { name: "Coop", address: "Via Nizza 262, Torino", lat: 45.0415, lng: 7.6696 },
  { name: "Iper", address: "Corso Romania 460, Torino", lat: 45.0838, lng: 7.6916 },
  
  // Napoli
  { name: "Carrefour", address: "Via Argine 380, Napoli", lat: 40.8646, lng: 14.3054 },
  { name: "Coop", address: "Via Galileo Ferraris 148, Napoli", lat: 40.8551, lng: 14.2820 },
  { name: "Lidl", address: "Via Ferrante Imparato 200, Napoli", lat: 40.8734, lng: 14.2463 },
  { name: "MD", address: "Via Nazionale 1000, Napoli", lat: 40.9086, lng: 14.3414 },
  
  // Firenze
  { name: "Esselunga", address: "Via Pisana 130, Firenze", lat: 43.7696, lng: 11.2268 },
  { name: "Coop", address: "Via Faentina 210, Firenze", lat: 43.8014, lng: 11.3086 },
  { name: "Carrefour", address: "Viale Europa 175, Firenze", lat: 43.7583, lng: 11.2086 },
  
  // Bologna
  { name: "Conad", address: "Via Emilia Ponente 74, Bologna", lat: 44.4899, lng: 11.2954 },
  { name: "Coop", address: "Via Marconi 25, Bologna", lat: 44.4899, lng: 11.3426 },
  { name: "Esselunga", address: "Via Marco Polo 1, Bologna", lat: 44.5067, lng: 11.3449 },
  
  // Palermo
  { name: "Carrefour", address: "Via Empedocle Restivo 408, Palermo", lat: 38.1418, lng: 13.3405 },
  { name: "Lidl", address: "Via Ugo La Malfa 103, Palermo", lat: 38.1656, lng: 13.3464 },
  { name: "Coop", address: "Via Montepellegrino 1, Palermo", lat: 38.1553, lng: 13.3608 },
  
  // Genova
  { name: "Esselunga", address: "Via Giotto 36, Genova", lat: 44.4283, lng: 8.9265 },
  { name: "Coop", address: "Via Piacenza 4, Genova", lat: 44.4169, lng: 8.9326 },
  { name: "Carrefour", address: "Via Greto di Cornigliano 11, Genova", lat: 44.4171, lng: 8.8788 },
  
  // Venezia
  { name: "Conad", address: "Via Triestina 172, Mestre", lat: 45.4894, lng: 12.2784 },
  { name: "Lidl", address: "Via Torino 147, Mestre", lat: 45.4867, lng: 12.2437 },
  { name: "Coop", address: "Piazzale Candiani 18, Mestre", lat: 45.4840, lng: 12.2314 },
  
  // Verona
  { name: "Esselunga", address: "Viale del Lavoro 12, Verona", lat: 45.4114, lng: 10.9787 },
  { name: "Pam", address: "Via Sommacampagna 63, Verona", lat: 45.4542, lng: 10.9392 },
  
  // Bari
  { name: "Carrefour", address: "Via Melo 222, Bari", lat: 41.1177, lng: 16.8718 },
  { name: "Lidl", address: "Via Giulio Petroni 85, Bari", lat: 41.1179, lng: 16.8825 },
  
  // Catania
  { name: "Lidl", address: "Via Passo Gravina 197, Catania", lat: 37.5135, lng: 15.0867 },
  { name: "Carrefour", address: "Via Vincenzo Giuffrida 23, Catania", lat: 37.5165, lng: 15.0840 },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  useEffect(() => {
    const geocodeAddress = async () => {
      if (!deliveryAddress.trim()) {
        setFilteredStores(stores);
        setAddressLocation(null);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(deliveryAddress)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setAddressLocation([lat, lng]);

          const nearby = stores.filter(store => {
            const distance = calculateDistance(lat, lng, store.lat, store.lng);
            return distance <= 7;
          });
          setFilteredStores(nearby);
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

    const timeoutId = setTimeout(geocodeAddress, 500);
    return () => clearTimeout(timeoutId);
  }, [deliveryAddress]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const DefaultIcon = L.icon({
      iconUrl: icon,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    const center = addressLocation || userLocation;
    
    if (mapRef.current) {
      mapRef.current.setView(center, 13);
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle) {
          mapRef.current?.removeLayer(layer);
        }
      });
    } else {
      const map = L.map(mapContainerRef.current).setView(center, 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    }

    if (addressLocation && mapRef.current) {
      L.circle(addressLocation, {
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.1,
        radius: 7000
      }).addTo(mapRef.current);

      L.marker(addressLocation, { icon: DefaultIcon })
        .addTo(mapRef.current)
        .bindPopup('📍 Indirizzo di consegna');
    }

    filteredStores.forEach((store) => {
      if (!mapRef.current) return;
      const marker = L.marker([store.lat, store.lng], { icon: DefaultIcon }).addTo(mapRef.current);
      
      let popupContent = `<div class="text-center">
        <strong>${store.name}</strong><br/>
        ${store.address}`;
      
      if (addressLocation) {
        const dist = calculateDistance(addressLocation[0], addressLocation[1], store.lat, store.lng);
        popupContent += `<br/><small>${dist.toFixed(1)} km di distanza</small>`;
      }
      
      popupContent += `</div>`;
      marker.bindPopup(popupContent);
      marker.on('click', () => onSelectStore(`${store.name} - ${store.address}`));
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLocation, addressLocation, filteredStores, onSelectStore]);

  return (
    <div className="space-y-2">
      <div 
        ref={mapContainerRef} 
        className="h-[400px] w-full rounded-lg overflow-hidden border border-border"
      />
      {deliveryAddress && filteredStores.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          ⚠️ Nessun supermercato trovato entro 7km dall'indirizzo specificato
        </p>
      )}
    </div>
  );
};

export default SupermarketMap;
