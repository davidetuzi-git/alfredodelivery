import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Store, User, Phone, Package, CheckCircle2, Navigation } from "lucide-react";
import OrderChat from "@/components/OrderChat";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  checked?: boolean;
}

interface Order {
  id: string;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  store_name: string;
  delivery_date: string;
  time_slot: string;
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  delivery_status: string;
  created_at: string;
}

const DelivererOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [delivererName, setDelivererName] = useState<string>("");

  useEffect(() => {
    loadOrderDetails();
    loadDelivererInfo();
  }, [orderId]);

  useEffect(() => {
    let watchId: number | null = null;

    if (sharingLocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Update deliverer position in database
            const { error } = await supabase
              .from('deliverers')
              .update({
                latitude,
                longitude
              })
              .eq('user_id', session.user.id);

            if (error) {
              console.error('Error updating position:', error);
            }
          } catch (error) {
            console.error('Error sharing location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error("Errore nell'accesso alla posizione");
          setSharingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [sharingLocation]);

  const loadDelivererInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('deliverers')
        .select('name')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setDelivererName(data.name);
      }
    } catch (error) {
      console.error('Error loading deliverer info:', error);
    }
  };

  const toggleLocationSharing = () => {
    if (!sharingLocation) {
      if ('geolocation' in navigator) {
        setSharingLocation(true);
        toast.success("Condivisione posizione attivata");
      } else {
        toast.error("Geolocalizzazione non supportata");
      }
    } else {
      setSharingLocation(false);
      toast.success("Condivisione posizione disattivata");
    }
  };

  const loadOrderDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/deliverer-auth');
        return;
      }

      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (orderData) {
        // Initialize items with checked state first
        const itemsArray = Array.isArray(orderData.items) ? orderData.items : [];
        const itemsWithState = itemsArray.map((item: any) => ({
          name: item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          checked: false
        }));
        setItems(itemsWithState);
        
        // Set order with properly typed items
        const orderWithItems: Order = {
          ...orderData,
          items: itemsWithState
        };
        
        setOrder(orderWithItems);
      }
    } catch (error: any) {
      console.error("Error loading order:", error);
      toast.error("Errore nel caricamento dell'ordine");
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = async (index: number) => {
    const currentCheckedCount = items.filter(item => item.checked).length;
    const newItems = items.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    );
    const newCheckedCount = newItems.filter(item => item.checked).length;
    
    setItems(newItems);

    try {
      // Se è il primo prodotto spuntato, aggiorna lo stato a "at_store"
      if (currentCheckedCount === 0 && newCheckedCount === 1 && order?.delivery_status === 'assigned') {
        const { error } = await supabase
          .from('orders')
          .update({ 
            delivery_status: 'at_store',
            status: 'at_store'
          })
          .eq('id', orderId);

        if (error) throw error;
        
        // Aggiorna l'ordine locale
        if (order) {
          setOrder({ ...order, delivery_status: 'at_store' });
        }
        
        toast.success("Stato aggiornato: Arrivato al supermercato");
      }
      
      // Se tutti i prodotti sono spuntati, aggiorna lo stato a "shopping_complete"
      if (newCheckedCount === items.length && order?.delivery_status === 'at_store') {
        const { error } = await supabase
          .from('orders')
          .update({ 
            delivery_status: 'shopping_complete',
            status: 'shopping_complete'
          })
          .eq('id', orderId);

        if (error) throw error;
        
        // Aggiorna l'ordine locale
        if (order) {
          setOrder({ ...order, delivery_status: 'shopping_complete' });
        }
        
        toast.success("Stato aggiornato: Spesa completata");
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const handleCompleteOrder = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_status: 'delivered',
          status: 'delivered'
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Ordine completato!");
      navigate('/deliverer-dashboard');
    } catch (error: any) {
      console.error("Error completing order:", error);
      toast.error("Errore nel completamento dell'ordine");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ordine non trovato</p>
      </div>
    );
  }

  const checkedCount = items.filter(item => item.checked).length;
  const totalItems = items.length;
  const allChecked = checkedCount === totalItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate('/deliverer-dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Dettagli Ordine</h1>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Codice Ritiro</CardTitle>
                <p className="text-3xl font-bold text-primary mt-2">{order.pickup_code}</p>
              </div>
              <Badge className="bg-blue-500">
                {order.delivery_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Ritiro da:</p>
                <p className="text-muted-foreground">{order.store_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Consegna a:</p>
                <p className="text-muted-foreground">{order.delivery_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Orario:</p>
                <p className="text-muted-foreground">
                  {new Date(order.delivery_date).toLocaleDateString('it-IT')} - {order.time_slot}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Cliente:</p>
                <p className="text-muted-foreground">{order.customer_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Telefono:</p>
                <p className="text-muted-foreground">{order.customer_phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Lista della Spesa</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {checkedCount}/{totalItems} completati
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    item.checked ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-background'
                  }`}
                >
                  <Checkbox
                    id={`item-${index}`}
                    checked={item.checked}
                    onCheckedChange={() => toggleItemCheck(index)}
                  />
                  <label
                    htmlFor={`item-${index}`}
                    className={`flex-1 cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Quantità: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Totale:</span>
                <span>€{order.total_amount.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground text-right">
                (Include €{order.delivery_fee.toFixed(2)} di consegna)
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4">
          <Button
            onClick={toggleLocationSharing}
            variant={sharingLocation ? "default" : "outline"}
            className="w-full"
            size="lg"
          >
            <Navigation className={`h-5 w-5 mr-2 ${sharingLocation ? 'animate-pulse' : ''}`} />
            {sharingLocation ? 'Condivisione posizione attiva' : 'Condividi posizione con cliente'}
          </Button>
        </div>

        <div className="mb-4">
          <OrderChat
            orderId={order.id}
            customerName={order.customer_name}
            delivererName={delivererName}
            userType="deliverer"
          />
        </div>

        <Button
          onClick={handleCompleteOrder}
          disabled={!allChecked}
          className="w-full"
          size="lg"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {allChecked ? 'Completa Consegna' : `Spunta tutti gli articoli (${checkedCount}/${totalItems})`}
        </Button>
      </div>
    </div>
  );
};

export default DelivererOrderDetail;
