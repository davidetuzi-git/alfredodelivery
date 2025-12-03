import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, LogOut, Phone, Mail, Power, Star, Calendar as CalendarIcon, User, Upload } from "lucide-react";
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
  base_address: string | null;
  operating_radius_km: number | null;
  telegram_chat_id: string | null;
  avatar_url: string | null;
  rating: number | null;
  total_deliveries: number | null;
  on_time_deliveries: number | null;
}

interface AddressChangeRequest {
  id: string;
  status: string;
  requested_address: string;
  created_at: string;
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
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
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

    // Carica ordini aperti (in corso) già assegnati al fattorino
    const { data: openOrdersData } = await supabase
      .from('orders')
      .select('*')
      .eq('deliverer_id', delivererData.id)
      .in('delivery_status', ['assigned', 'at_store', 'shopping_complete', 'on_the_way'])
      .order('delivery_date', { ascending: true });

    if (openOrdersData) {
      // Auto-expire orders that are more than 2 weeks past delivery date
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const expiredOrders: Order[] = [];
      const activeOrders: Order[] = [];
      
      for (const order of openOrdersData) {
        const deliveryDate = new Date(order.delivery_date);
        if (deliveryDate < twoWeeksAgo) {
          expiredOrders.push(order);
        } else {
          activeOrders.push(order);
        }
      }
      
      // Update expired orders in database
      if (expiredOrders.length > 0) {
        const expiredIds = expiredOrders.map(o => o.id);
        await supabase
          .from('orders')
          .update({ delivery_status: 'expired' })
          .in('id', expiredIds);
        
        console.log(`Auto-expired ${expiredOrders.length} orders older than 2 weeks`);
      }
      
      setOpenOrders(activeOrders);
    }

    // Calcola automaticamente lo stato "busy" SOLO se ci sono consegne in corso OGGI
    let finalStatus = delivererData.status;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filtra ordini che sono effettivamente in corso oggi
    const ordersInProgressToday = openOrdersData?.filter(order => {
      const deliveryDate = new Date(order.delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate.getTime() === today.getTime();
    }) || [];

    if (ordersInProgressToday.length > 0) {
      // Se ha ordini in corso OGGI, forzalo a "busy"
      finalStatus = 'busy';
      
      // Aggiorna il database solo se lo stato non è già "busy"
      if (delivererData.status !== 'busy') {
        await supabase
          .from('deliverers')
          .update({ status: 'busy' })
          .eq('id', delivererData.id);
      }
    } else if (delivererData.status === 'busy') {
      // Se non ha ordini in corso oggi ma è segnato come busy, 
      // ripristina a "available" automaticamente
      finalStatus = 'available';
      await supabase
        .from('deliverers')
        .update({ status: 'available' })
        .eq('id', delivererData.id);
    }

    setDeliverer({ ...delivererData, status: finalStatus });
    
    // Carica ordini disponibili nella zona (10km)
    if (delivererData.latitude && delivererData.longitude) {
      await loadAvailableOrders(delivererData.latitude, delivererData.longitude);
    }

    // Carica ordini chiusi (completati/cancellati/scaduti) già assegnati al fattorino
    const { data: closedOrdersData } = await supabase
      .from('orders')
      .select('*')
      .eq('deliverer_id', delivererData.id)
      .in('delivery_status', ['delivered', 'cancelled', 'expired'])
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

  const updateAvailabilityStatus = async (newStatus: 'available' | 'inactive') => {
    if (!deliverer) return;
    
    // Controlla ordini in corso OGGI
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersInProgressToday = openOrders.filter(order => {
      const deliveryDate = new Date(order.delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate.getTime() === today.getTime();
    });

    // Non permettere il cambio di stato se il fattorino ha ordini in corso OGGI
    if (ordersInProgressToday.length > 0) {
      toast.error("Non puoi cambiare stato mentre hai consegne in corso oggi. Completa prima le tue consegne.");
      return;
    }
    
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

      // Aggiorna il numero di ordini correnti del fattorino e imposta stato su "busy"
      const { error: delivererError } = await supabase
        .from('deliverers')
        .update({
          current_orders: deliverer.current_orders + 1,
          status: 'busy' // Imposta automaticamente come occupato
        })
        .eq('id', deliverer.id);

      if (delivererError) throw delivererError;

      // Rimuovi l'ordine dagli ordini disponibili
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Aggiungi l'ordine accettato agli ordini aperti immediatamente
      const { data: acceptedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (acceptedOrder) {
        setOpenOrders(prev => [acceptedOrder, ...prev].sort((a, b) => 
          new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
        ));
      }
      
      // Aggiorna il deliverer con il nuovo conteggio ordini e stato busy
      setDeliverer(prev => prev ? { 
        ...prev, 
        current_orders: prev.current_orders + 1,
        status: 'busy' 
      } : null);

      toast.success("Ordine accettato! Sei ora occupato con questa consegna");
      
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
      case 'expired':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermato';
      case 'assigned':
        return 'Assegnato';
      case 'at_store':
        return 'Al Negozio';
      case 'shopping_complete':
        return 'Spesa Completata';
      case 'on_the_way':
        return 'In Consegna';
      case 'delivered':
        return 'Consegnato';
      case 'cancelled':
        return 'Annullato';
      case 'expired':
        return 'Scaduto';
      default:
        return status;
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
          <div className="flex items-center gap-3">
            {/* Menu a tendina per lo stato */}
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-muted-foreground" />
              <Select
                value={deliverer.status}
                onValueChange={(value: 'available' | 'inactive') => updateAvailabilityStatus(value)}
                disabled={updatingStatus || deliverer.status === 'busy'}
              >
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(deliverer.status)}`} />
                      <span>{getStatusLabel(deliverer.status)}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="available">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Disponibile</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                      <span>Non Attivo</span>
                    </div>
                  </SelectItem>
                  {deliverer.status === 'busy' && (
                    <SelectItem value="busy" disabled>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span>Occupato (auto)</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {deliverer.status === 'busy' && (
            <Card className="md:col-span-2 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Power className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-700 dark:text-yellow-500">
                    Hai {openOrders.filter(order => {
                      const deliveryDate = new Date(order.delivery_date);
                      deliveryDate.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return deliveryDate.getTime() === today.getTime();
                    }).length} consegna/e in corso oggi
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Completa le consegne per cambiare stato
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

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
              </div>
              
              <Button 
                onClick={() => navigate('/deliverer-profile')}
                variant="outline"
                className="w-full mt-4"
              >
                <User className="h-4 w-4 mr-2" />
                Modifica Profilo
              </Button>
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