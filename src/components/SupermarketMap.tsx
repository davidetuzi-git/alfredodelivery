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
  // Roma Centro
  { name: "Esselunga", address: "Via Tuscolana 123, Roma", lat: 41.8719, lng: 12.5144 },
  { name: "Carrefour Express", address: "Via Appia Nuova 45, Roma", lat: 41.8769, lng: 12.5186 },
  { name: "Coop", address: "Via dei Castani 67, Roma", lat: 41.8689, lng: 12.5204 },
  { name: "Conad", address: "Viale Manzoni 89, Roma", lat: 41.8929, lng: 12.5014 },
  { name: "Pam Panorama", address: "Via Prenestina 112, Roma", lat: 41.8859, lng: 12.5275 },
  { name: "Lidl", address: "Via Casilina 234, Roma", lat: 41.8799, lng: 12.5456 },
  { name: "MD Discount", address: "Via di Torre Spaccata 56, Roma", lat: 41.8669, lng: 12.5789 },
  { name: "Eurospin", address: "Via Tiburtina 145, Roma", lat: 41.9019, lng: 12.5234 },
  { name: "Carrefour Market", address: "Piazza Bologna 78, Roma", lat: 41.9119, lng: 12.5144 },
  { name: "Todis", address: "Via Nomentana 234, Roma", lat: 41.9189, lng: 12.5304 },
  { name: "Iper", address: "Via Collatina 321, Roma", lat: 41.8929, lng: 12.5789 },
  { name: "Tuodì", address: "Via Tor Vergata 45, Roma", lat: 41.8419, lng: 12.6234 },
  { name: "Unes", address: "Via Laurentina 167, Roma", lat: 41.8329, lng: 12.4789 },
  { name: "Simply", address: "Via Ostiense 289, Roma", lat: 41.8579, lng: 12.4789 },
  { name: "Penny Market", address: "Via Cristoforo Colombo 234, Roma", lat: 41.8459, lng: 12.4834 },
  // Aggiungi più supermercati per coprire diverse zone
  { name: "Conad City", address: "Via Gregorio VII 89, Roma", lat: 41.9029, lng: 12.4534 },
  { name: "Carrefour", address: "Via Aurelia 456, Roma", lat: 41.9119, lng: 12.4289 },
  { name: "Coop Centro Italia", address: "Via della Pisana 234, Roma", lat: 41.8709, lng: 12.4189 },
  { name: "Esselunga", address: "Via del Mare 123, Roma", lat: 41.8329, lng: 12.5344 },
  { name: "Iper La Grande I", address: "Via Laurentina 865, Roma", lat: 41.8019, lng: 12.4689 },
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
