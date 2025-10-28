import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, LogOut, MapPin, Phone, Mail, Save, MessageCircle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Deliverer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
  operating_radius_km: number | null;
  telegram_chat_id: string | null;
}

interface DeliveryNotification {
  id: string;
  order_id: string;
  deliverer_id: string;
  status: string;
  created_at: string;
  orders: {
    id: string;
    customer_name: string;
    delivery_address: string;
    delivery_date: string;
    time_slot: string;
    store_name: string;
    total_amount: number;
  };
}

interface Order {
  id: string;
  customer_name: string;
  delivery_address: string;
  delivery_status: string;
  total_amount: number;
  created_at: string;
}

const DelivererDashboard = () => {
  const navigate = useNavigate();
  const [deliverer, setDeliverer] = useState<Deliverer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseAddress, setBaseAddress] = useState("");
  const [baseLatitude, setBaseLatitude] = useState<number | null>(null);
  const [baseLongitude, setBaseLongitude] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (!deliverer) return;

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('delivery-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_notifications',
          filter: `deliverer_id=eq.${deliverer.id}`,
        },
        async (payload) => {
          console.log('New notification:', payload);
          
          // Fetch order details for the notification
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', payload.new.order_id)
            .single();

          if (orderData) {
            toast.info("Nuova consegna disponibile!", {
              description: `${orderData.store_name} - ${orderData.delivery_address}`,
            });
            
            // Add to notifications list
            setNotifications(prev => [{
              ...payload.new as any,
              orders: orderData,
            }, ...prev]);
          }
        }
      )
      .subscribe();

    // Load existing pending notifications
    loadNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliverer]);

  const loadNotifications = async () => {
    if (!deliverer) return;

    const { data } = await supabase
      .from('delivery_notifications')
      .select(`
        *,
        orders (
          id,
          customer_name,
          delivery_address,
          delivery_date,
          time_slot,
          store_name,
          total_amount
        )
      `)
      .eq('deliverer_id', deliverer.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data as any);
    }
  };

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/deliverer/auth');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'deliverer')
        .single();

      if (!roles) {
        toast.error("Non hai i permessi per accedere a questa pagina");
        navigate('/');
        return;
      }

      await loadDelivererData(session.user.id);
    } catch (error: any) {
      console.error("Error checking auth:", error);
      navigate('/deliverer/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadDelivererData = async (userId: string) => {
    const { data: delivererData, error: delivererError } = await supabase
      .from('deliverers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (delivererError) {
      toast.error("Errore nel caricamento dei dati");
      return;
    }

    setDeliverer(delivererData);
    
    // Imposta l'indirizzo base e chat_id se già salvati
    if (delivererData.latitude && delivererData.longitude) {
      setBaseLatitude(delivererData.latitude);
      setBaseLongitude(delivererData.longitude);
    }
    
    if (delivererData.telegram_chat_id) {
      setTelegramChatId(delivererData.telegram_chat_id);
    }

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('deliverer_id', delivererData.id)
      .order('created_at', { ascending: false });

    if (ordersData) {
      setOrders(ordersData);
    }
  };

  const handleSaveBaseAddress = async () => {
    if (!baseLatitude || !baseLongitude || !deliverer) {
      toast.error("Seleziona un indirizzo dalla lista");
      return;
    }

    setSavingAddress(true);
    try {
      const { error } = await supabase
        .from('deliverers')
        .update({
          latitude: baseLatitude,
          longitude: baseLongitude,
          operating_radius_km: 10,
        })
        .eq('id', deliverer.id);

      if (error) throw error;

      toast.success("Indirizzo base salvato! Riceverai notifiche per ordini entro 10km");
      
      // Ricarica i dati
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadDelivererData(session.user.id);
      }
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast.error("Errore nel salvataggio dell'indirizzo");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveTelegramChatId = async () => {
    if (!telegramChatId.trim() || !deliverer) {
      toast.error("Inserisci un chat_id valido");
      return;
    }

    setSavingTelegram(true);
    try {
      const { error } = await supabase
        .from('deliverers')
        .update({ telegram_chat_id: telegramChatId.trim() })
        .eq('id', deliverer.id);

      if (error) throw error;

      toast.success("Chat ID Telegram salvato! Riceverai notifiche su Telegram");
      
      // Ricarica i dati
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadDelivererData(session.user.id);
      }
    } catch (error: any) {
      console.error("Error saving telegram chat_id:", error);
      toast.error("Errore nel salvataggio del chat_id");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/deliverer/auth');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'delivered':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!deliverer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Dashboard Fattorino</h1>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Il Tuo Profilo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{deliverer.name}</p>
                <Badge className={getStatusColor(deliverer.status)}>
                  {deliverer.status === 'available' ? 'Disponibile' : 
                   deliverer.status === 'busy' ? 'Occupato' : 'Offline'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{deliverer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{deliverer.phone}</span>
                </div>
                {deliverer.zone && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>Zona: {deliverer.zone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiche</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Ordini Correnti</p>
                <p className="text-3xl font-bold">
                  {deliverer.current_orders}/{deliverer.max_orders}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totale Ordini</p>
                <p className="text-3xl font-bold">{orders.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {notifications.length > 0 && (
          <Card className="mb-6 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                🔔 Nuove Consegne Disponibili
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                          {notif.orders.store_name}
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          📍 {notif.orders.delivery_address}
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          📅 {new Date(notif.orders.delivery_date).toLocaleDateString('it-IT')} - {notif.orders.time_slot}
                        </p>
                      </div>
                      <Badge className="bg-yellow-600">
                        €{notif.orders.total_amount.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      Ricevuta {new Date(notif.created_at).toLocaleTimeString('it-IT')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Indirizzo Base & Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliverer.latitude && deliverer.longitude ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Indirizzo base configurato
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Riceverai notifiche {deliverer.telegram_chat_id ? 'Telegram' : 'in-app'} per ordini entro {deliverer.operating_radius_km || 10} km
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Coordinate: {deliverer.latitude.toFixed(6)}, {deliverer.longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <MapPin className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Configura il tuo indirizzo base
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Riceverai notifiche in-app per ordini entro 10 km dal tuo indirizzo
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="base-address">
                {deliverer.latitude ? "Aggiorna indirizzo base" : "Inserisci il tuo indirizzo base"}
              </Label>
              <AddressAutocomplete
                value={baseAddress}
                onSelect={(address, lat, lon) => {
                  setBaseAddress(address);
                  setBaseLatitude(lat);
                  setBaseLongitude(lon);
                }}
                placeholder="Via Roma 1, Milano, MI"
              />
            </div>

            <Button 
              onClick={handleSaveBaseAddress}
              disabled={!baseLatitude || !baseLongitude || savingAddress}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {savingAddress ? "Salvataggio..." : "Salva Indirizzo Base"}
            </Button>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Notifiche Telegram</h3>
              </div>
              
              {deliverer.telegram_chat_id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Telegram configurato! ✅
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Chat ID: {deliverer.telegram_chat_id}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram-chatid">Aggiorna Chat ID</Label>
                    <Input
                      id="telegram-chatid"
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      💬 Attiva notifiche Telegram
                    </p>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside mb-3">
                      <li>Cerca <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">@Alfredo257_bot</code> su Telegram</li>
                      <li>Invia <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/start</code></li>
                      <li>Il bot ti risponderà con il tuo chat_id</li>
                      <li>Copia il numero qui sotto e salva</li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telegram-chatid">Il tuo Chat ID Telegram</Label>
                    <Input
                      id="telegram-chatid"
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSaveTelegramChatId}
                disabled={!telegramChatId.trim() || savingTelegram}
                className="w-full mt-3"
                variant="outline"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {savingTelegram ? "Salvataggio..." : "Salva Chat ID Telegram"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>I Tuoi Ordini</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun ordine ancora
              </p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.delivery_address}
                        </p>
                      </div>
                      <Badge className={getOrderStatusColor(order.delivery_status)}>
                        {order.delivery_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm">
                        {new Date(order.created_at).toLocaleDateString('it-IT')}
                      </p>
                      <p className="font-semibold">€{order.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DelivererDashboard;