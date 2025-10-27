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
  { name: "Esselunga", address: "Via Roma 123", lat: 41.9028, lng: 12.4964 },
  { name: "Carrefour", address: "Piazza Duomo 45", lat: 41.9055, lng: 12.4823 },
  { name: "Coop", address: "Corso Italia 67", lat: 41.8989, lng: 12.5013 },
  { name: "Conad", address: "Via Milano 89", lat: 41.9102, lng: 12.4891 },
  { name: "Pam", address: "Viale Europa 12", lat: 41.8956, lng: 12.5075 },
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
    if (!mapContainerRef.current || mapRef.current) return;

    const DefaultIcon = L.icon({
      iconUrl: icon,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    const center = addressLocation || userLocation;
    const map = L.map(mapContainerRef.current).setView(center, 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (addressLocation) {
      L.circle(addressLocation, {
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.1,
        radius: 7000
      }).addTo(map);

      L.marker(addressLocation, { icon: DefaultIcon })
        .addTo(map)
        .bindPopup('📍 Indirizzo di consegna');
    }

    filteredStores.forEach((store) => {
      const marker = L.marker([store.lat, store.lng], { icon: DefaultIcon }).addTo(map);
      
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
      map.remove();
      mapRef.current = null;
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
