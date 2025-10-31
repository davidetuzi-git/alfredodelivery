import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Truck, LogOut, MapPin, Phone, Mail, Save, MessageCircle, Power, Upload, Star, Calendar as CalendarIcon } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DeliveryCalendar } from "@/components/deliverer/DeliveryCalendar";

interface Deliverer {
  id: string;
  user_id: string;
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
  avatar_url: string | null;
  rating: number | null;
  total_deliveries: number | null;
  on_time_deliveries: number | null;
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
  store_name: string;
  delivery_date: string;
  time_slot: string;
  latitude: number | null;
  longitude: number | null;
  deliverer_id: string | null;
  pickup_code: string;
}

const DelivererDashboard = () => {
  const navigate = useNavigate();
  const [deliverer, setDeliverer] = useState<Deliverer | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [closedOrders, setClosedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseAddress, setBaseAddress] = useState("");
  const [baseLatitude, setBaseLatitude] = useState<number | null>(null);
  const [baseLongitude, setBaseLongitude] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (!deliverer) return;

    // Subscribe to real-time notifications for new orders
    const notificationsChannel = supabase
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

    // Subscribe to orders table changes to update available orders list
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('Order changed:', payload);
          // Reload available orders when any order changes
          if (deliverer.latitude && deliverer.longitude) {
            await loadAvailableOrders(deliverer.latitude, deliverer.longitude);
          }
        }
      )
      .subscribe();

    // Load existing pending notifications
    loadNotifications();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(ordersChannel);
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
        navigate('/deliverer-auth');
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
      navigate('/deliverer-auth');
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
      
      // Carica ordini disponibili nella zona (10km)
      await loadAvailableOrders(delivererData.latitude, delivererData.longitude);
    }
    
    if (delivererData.telegram_chat_id) {
      setTelegramChatId(delivererData.telegram_chat_id);
    }

    // Carica ordini aperti (in corso) già assegnati al fattorino
    const { data: openOrdersData } = await supabase
      .from('orders')
      .select('*')
      .eq('deliverer_id', delivererData.id)
      .in('delivery_status', ['assigned', 'at_store', 'shopping_complete', 'on_the_way'])
      .order('created_at', { ascending: false });

    if (openOrdersData) {
      setOpenOrders(openOrdersData);
    }

    // Carica ordini chiusi (completati/cancellati) già assegnati al fattorino
    const { data: closedOrdersData } = await supabase
      .from('orders')
      .select('*')
      .eq('deliverer_id', delivererData.id)
      .in('delivery_status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false });

    if (closedOrdersData) {
      setClosedOrders(closedOrdersData);
    }
  };

  const loadAvailableOrders = async (lat: number, lon: number) => {
    // Carica ordini confermati ma non ancora assegnati nella zona
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_status', 'confirmed')
      .is('deliverer_id', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      console.error('Error loading available orders:', error);
      return;
    }

    if (data) {
      const now = new Date();
      // Filtra ordini entro 10km e con data di consegna futura
      const ordersInRange: Order[] = [];
      
      for (const order of data) {
        // Verifica se la data di consegna è passata
        const deliveryDate = new Date(order.delivery_date);
        if (deliveryDate < now) {
          continue; // Salta ordini con data passata
        }

        if (order.latitude && order.longitude) {
          const { data: distanceData } = await supabase
            .rpc('calculate_distance', {
              lat1: lat,
              lon1: lon,
              lat2: order.latitude,
              lon2: order.longitude
            });
          
          if (distanceData !== null && distanceData <= 10) {
            ordersInRange.push(order as Order);
          }
        }
      }
      
      setAvailableOrders(ordersInRange);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!deliverer || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${deliverer.user_id}/${Date.now()}.${fileExt}`;
    
    setUploadingAvatar(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('deliverer-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deliverer-avatars')
        .getPublicUrl(fileName);

      // Update deliverer profile
      const { error: updateError } = await supabase
        .from('deliverers')
        .update({ avatar_url: publicUrl })
        .eq('id', deliverer.id);

      if (updateError) throw updateError;

      setDeliverer({ ...deliverer, avatar_url: publicUrl });
      toast.success("Foto profilo aggiornata!");
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error("Errore nel caricamento della foto");
    } finally {
      setUploadingAvatar(false);
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

  const updateAvailabilityStatus = async (newStatus: 'available' | 'unavailable' | 'inactive') => {
    if (!deliverer) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('deliverers')
        .update({ status: newStatus })
        .eq('id', deliverer.id);

      if (error) throw error;

      setDeliverer({ ...deliverer, status: newStatus });
      toast.success("Stato aggiornato con successo!");
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Errore nell'aggiornamento dello stato");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!deliverer) return;
    
    setAcceptingOrder(orderId);
    try {
      // Aggiorna l'ordine assegnandolo al fattorino e cambiando lo stato
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          deliverer_id: deliverer.id,
          deliverer_name: deliverer.name,
          deliverer_phone: deliverer.phone,
          delivery_status: 'assigned',
          status: 'assigned'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Aggiorna il numero di ordini correnti del fattorino
      const { error: delivererError } = await supabase
        .from('deliverers')
        .update({
          current_orders: deliverer.current_orders + 1
        })
        .eq('id', deliverer.id);

      if (delivererError) throw delivererError;

      toast.success("Ordine accettato! Ora puoi vedere tutti i dettagli");
      
      // Ricarica i dati
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadDelivererData(session.user.id);
      }
      
      // Naviga ai dettagli dell'ordine
      navigate(`/deliverer-order/${orderId}`);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error("Errore nell'accettazione dell'ordine");
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/deliverer-auth');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'inactive':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'busy':
        return 'Occupato';
      case 'inactive':
        return 'Non Attivo';
      default:
        return status;
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

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {/* Card Disponibilità */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Disponibilità
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <Badge className={`${getStatusColor(deliverer.status)} text-lg py-2 px-4`}>
                  {getStatusLabel(deliverer.status)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={() => updateAvailabilityStatus('available')}
                  disabled={updatingStatus || deliverer.status === 'available'}
                  className="w-full bg-green-500 hover:bg-green-600"
                  variant={deliverer.status === 'available' ? 'default' : 'outline'}
                >
                  ✅ Disponibile
                </Button>
                
                <Button
                  onClick={() => updateAvailabilityStatus('inactive')}
                  disabled={updatingStatus || deliverer.status === 'inactive'}
                  className="w-full bg-gray-500 hover:bg-gray-600"
                  variant={deliverer.status === 'inactive' ? 'default' : 'outline'}
                >
                  🔴 Non Attivo
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1 mt-4 p-3 bg-muted/50 rounded-lg">
                <p><strong>Disponibile:</strong> Ricevi nuove consegne</p>
                <p><strong>Non Attivo:</strong> Fuori servizio</p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Il Tuo Profilo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={deliverer.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {deliverer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90">
                      <Upload className="h-4 w-4" />
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{deliverer.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(deliverer.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">
                        {deliverer.rating?.toFixed(1) || '0.0'} / 5.0
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Consegne Totali</p>
                      <p className="font-semibold text-lg">{deliverer.total_deliveries || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Puntualità</p>
                      <p className="font-semibold text-lg">
                        {deliverer.total_deliveries && deliverer.on_time_deliveries
                          ? Math.round((deliverer.on_time_deliveries / deliverer.total_deliveries) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
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
                <p className="text-sm text-muted-foreground">Ordini Aperti</p>
                <p className="text-3xl font-bold">
                  {openOrders.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totale Completati</p>
                <p className="text-3xl font-bold">{closedOrders.length}</p>
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

        {/* Tabs per organizzare ordini: In Corso, Aperti, Chiusi, Calendario */}
        <Tabs defaultValue="in-corso" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="in-corso">
              🚚 In Corso ({openOrders.length})
            </TabsTrigger>
            <TabsTrigger value="aperti">
              📋 Aperti ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="chiusi">
              ✅ Chiusi ({closedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendario
            </TabsTrigger>
          </TabsList>

          {/* Tab: In Corso - Ordini accettati ma ancora da completare */}
          <TabsContent value="in-corso" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ordini in Corso</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ordini che hai accettato e che devi ancora completare
                </p>
              </CardHeader>
              <CardContent>
                {openOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun ordine in corso
                  </p>
                ) : (
                  <div className="space-y-4">
                    {openOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/deliverer-order/${order.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{order.customer_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.delivery_address}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.store_name}
                            </p>
                          </div>
                          <Badge className={getOrderStatusColor(order.delivery_status)}>
                            {order.delivery_status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-sm font-semibold">
                            €{order.total_amount.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(order.delivery_date).toLocaleDateString('it-IT')} - {order.time_slot}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Aperti - Ordini disponibili nella zona che potrebbero essere accettati */}
          <TabsContent value="aperti" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ordini Disponibili nella Tua Zona</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ordini entro 10km che puoi accettare. Scompaiono quando vengono accettati da qualsiasi deliverer.
                </p>
              </CardHeader>
              <CardContent>
                {availableOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun ordine disponibile nella tua zona al momento.
                    <br />
                    <span className="text-xs">
                      Gli ordini compaiono qui finché non vengono accettati da un deliverer.
                    </span>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {availableOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-green-900 dark:text-green-100">
                              {order.store_name}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              📍 {order.delivery_address}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              📅 {new Date(order.delivery_date).toLocaleDateString('it-IT')} - {order.time_slot}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              👤 {order.customer_name}
                            </p>
                          </div>
                          <Badge className="bg-green-600">
                            €{order.total_amount.toFixed(2)}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => handleAcceptOrder(order.id)}
                            disabled={acceptingOrder === order.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {acceptingOrder === order.id ? "Accettazione..." : "✅ Accetta Ordine"}
                          </Button>
                        </div>
                        
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          💡 Dopo l'accettazione potrai vedere tutti i dettagli dell'ordine nella sezione "In Corso"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Chiusi - Ordini completati o annullati */}
          <TabsContent value="chiusi" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ordini Chiusi</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ordini completati, annullati o non più attivi
                </p>
              </CardHeader>
              <CardContent>
                {closedOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun ordine completato
                  </p>
                ) : (
                  <div className="space-y-4">
                    {closedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/deliverer-order/${order.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{order.customer_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.delivery_address}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.store_name}
                            </p>
                          </div>
                          <Badge className={getOrderStatusColor(order.delivery_status)}>
                            {order.delivery_status === 'delivered' ? 'Consegnato' : 'Cancellato'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
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
          </TabsContent>

          {/* Tab: Calendario - Vista calendario con tutte le consegne */}
          <TabsContent value="calendario">
            <DeliveryCalendar 
              orders={[...openOrders, ...closedOrders]}
              onOrderClick={(order) => navigate(`/deliverer-order/${order.id}`)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DelivererDashboard;