import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryMapProps {
  delivererId: string;
  delivererName: string;
  customerLatitude: number;
  customerLongitude: number;
}

// Custom icons
const delivererIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customerIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-adjust map bounds
function MapBounds({ delivererPos, customerPos }: { delivererPos: [number, number]; customerPos: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (delivererPos[0] && delivererPos[1]) {
      map.fitBounds([delivererPos, customerPos], { padding: [50, 50] });
    }
  }, [delivererPos, customerPos, map]);
  
  return null;
}

const DeliveryMap = ({ delivererId, delivererName, customerLatitude, customerLongitude }: DeliveryMapProps) => {
  const [delivererPosition, setDelivererPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial deliverer position
    const loadDelivererPosition = async () => {
      const { data, error } = await supabase
        .from('deliverers')
        .select('latitude, longitude')
        .eq('id', delivererId)
        .single();

      if (error) {
        console.error('Error loading deliverer position:', error);
        setLoading(false);
        return;
      }

      if (data && data.latitude && data.longitude) {
        setDelivererPosition([data.latitude, data.longitude]);
      }
      setLoading(false);
    };

    loadDelivererPosition();

    // Subscribe to position updates
    const channel = supabase
      .channel('deliverer-position-' + delivererId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliverers',
          filter: `id=eq.${delivererId}`
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.latitude && newData.longitude) {
            setDelivererPosition([newData.latitude, newData.longitude]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivererId]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Caricamento mappa...</p>
      </div>
    );
  }

  if (!delivererPosition) {
    return (
      <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Posizione del deliverer non disponibile</p>
      </div>
    );
  }

  const customerPosition: [number, number] = [customerLatitude, customerLongitude];

  return (
    <div className="h-96 rounded-lg overflow-hidden border">
      <MapContainer
        center={delivererPosition}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Deliverer marker */}
        <Marker position={delivererPosition} icon={delivererIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">🚚 {delivererName}</p>
              <p className="text-sm text-muted-foreground">Il tuo deliverer</p>
            </div>
          </Popup>
        </Marker>

        {/* Customer marker */}
        <Marker position={customerPosition} icon={customerIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">🏠 La tua casa</p>
              <p className="text-sm text-muted-foreground">Destinazione</p>
            </div>
          </Popup>
        </Marker>

        {/* Auto-adjust bounds */}
        <MapBounds delivererPos={delivererPosition} customerPos={customerPosition} />
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;