import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

interface Supermarket {
  id: string;
  name: string;
  position: [number, number];
}

interface SupermarketMapProps {
  onSelectStore: (store: string) => void;
}

const SupermarketMap = ({ onSelectStore }: SupermarketMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const supermarkets: Supermarket[] = [
    { id: '1', name: 'Esselunga - Via Roma 123', position: [41.9028, 12.4964] },
    { id: '2', name: 'Carrefour - Piazza Duomo 45', position: [41.9000, 12.5000] },
    { id: '3', name: 'Coop - Corso Italia 67', position: [41.9050, 12.4900] },
    { id: '4', name: 'Conad - Via Milano 89', position: [41.8980, 12.5050] },
    { id: '5', name: 'Pam - Viale Europa 12', position: [41.9100, 12.4850] },
  ];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Fix default icon
    const DefaultIcon = L.icon({
      iconUrl: icon,
      shadowUrl: iconShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([41.9028, 12.4964], 13);
    mapRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Add markers
    supermarkets.forEach((store) => {
      const marker = L.marker(store.position, { icon: DefaultIcon }).addTo(map);
      marker.bindPopup(`
        <div class="text-center">
          <strong>${store.name}</strong>
          <br />
          <button 
            class="text-primary hover:underline mt-1 cursor-pointer"
            onclick="window.selectStore('${store.name}')"
          >
            Seleziona
          </button>
        </div>
      `);
      marker.on('click', () => onSelectStore(store.name));
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Global handler for popup button clicks
  useEffect(() => {
    (window as any).selectStore = (storeName: string) => {
      onSelectStore(storeName);
    };
    return () => {
      delete (window as any).selectStore;
    };
  }, [onSelectStore]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-[400px] w-full rounded-lg overflow-hidden border border-border"
    />
  );
};

export default SupermarketMap;
