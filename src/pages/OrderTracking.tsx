import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { Package, MapPin, Clock, User, Phone, ArrowLeft, Bell, Calendar, ShoppingBag, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import OrderChat from "@/components/OrderChat";

const OrderTracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pickupCodeFromState = location.state?.pickupCode;
  
  const [pickupCode, setPickupCode] = useState(pickupCodeFromState || "");
  const [inputCode, setInputCode] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (pickupCodeFromState) {
      loadOrder(pickupCodeFromState);
    }
  }, [pickupCodeFromState]);

  useEffect(() => {
    if (order) {
      subscribeToOrderUpdates();
    }
  }, [order]);

  const loadOrder = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('pickup_code', code)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data);
        setPickupCode(code);
      } else {
        toast({
          title: "Errore",
          description: "Ordine non trovato",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare l'ordine",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrderUpdates = () => {
    if (!pickupCode) return;

    const channel = supabase
      .channel('order-updates-' + pickupCode)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `pickup_code=eq.${pickupCode}`
        },
        (payload) => {
          const oldStatus = order?.delivery_status;
          const newStatus = (payload.new as any).delivery_status;
          
          setOrder(payload.new);
          
          // Show notification for status changes
          if (notificationsEnabled && oldStatus !== newStatus) {
            showNotification(newStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const showNotification = (status: string) => {
    const statusMessages: Record<string, string> = {
      confirmed: "Ordine confermato!",
      assigned: "Un deliverer ha preso in carico il tuo ordine",
      at_store: "Il deliverer è arrivato al supermercato",
      shopping_complete: "La spesa è stata completata",
      on_the_way: "Il deliverer sta arrivando!",
      delivered: "Ordine consegnato!"
    };

    toast({
      title: statusMessages[status] || "Aggiornamento ordine",
      description: `Stato aggiornato`,
    });

    // Browser notification if permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Aggiornamento ordine", {
        body: statusMessages[status] || "Il tuo ordine è stato aggiornato",
        icon: "/favicon.ico"
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({
          title: "Notifiche attivate",
          description: "Riceverai aggiornamenti sullo stato dell'ordine",
        });
      }
    }
  };

  const handleSearchOrder = () => {
    if (inputCode.trim()) {
      loadOrder(inputCode.trim().toUpperCase());
    }
  };

  const handleEditOrder = () => {
    // Naviga alla pagina dell'ordine con i dati esistenti
    navigate('/ordina', { 
      state: { 
        editMode: true, 
        orderId: order.id,
        existingOrder: order 
      } 
    });
  };

  const handleCancelOrder = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_status: 'cancelled',
          status: 'cancelled'
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Ordine cancellato",
        description: "Il tuo ordine è stato cancellato con successo",
      });

      // Ricarica l'ordine per mostrare lo stato aggiornato
      loadOrder(pickupCode);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Errore",
        description: "Impossibile cancellare l'ordine",
        variant: "destructive",
      });
    }
  };

  // Determina se i pulsanti devono essere mostrati
  const canEditOrder = order && !['at_store', 'shopping_complete', 'on_the_way', 'delivered', 'cancelled'].includes(order.delivery_status);
  const canCancelOrder = order && !['in_progress', 'at_store', 'shopping_complete', 'on_the_way', 'delivered', 'cancelled'].includes(order.delivery_status);

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Tracking ordine</h1>
            <p className="text-muted-foreground">Inserisci il codice per tracciare il tuo ordine</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Cerca ordine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Codice ritiro</Label>
                <Input
                  id="code"
                  placeholder="ES: ABC12345"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
                />
              </div>
              <Button onClick={handleSearchOrder} disabled={loading || !inputCode.trim()} className="w-full">
                {loading ? "Ricerca..." : "Cerca ordine"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Traccia il tuo ordine</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {pickupCode}
                </Badge>
              </div>
            </div>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={requestNotificationPermission}
              disabled={notificationsEnabled}
            >
              <Bell className="mr-2 h-4 w-4" />
              {notificationsEnabled ? "Notifiche attive" : "Attiva notifiche"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Order Ticket - Stile ricevuta */}
        <Card className="relative overflow-hidden border-2 border-dashed border-primary/30">
          {/* Decorative notches */}
          <div className="absolute top-0 left-8 w-8 h-8 bg-background rounded-full -translate-y-1/2 border-2 border-dashed border-primary/30"></div>
          <div className="absolute top-0 right-8 w-8 h-8 bg-background rounded-full -translate-y-1/2 border-2 border-dashed border-primary/30"></div>
          <div className="absolute bottom-0 left-8 w-8 h-8 bg-background rounded-full translate-y-1/2 border-2 border-dashed border-primary/30"></div>
          <div className="absolute bottom-0 right-8 w-8 h-8 bg-background rounded-full translate-y-1/2 border-2 border-dashed border-primary/30"></div>
          
          <CardHeader className="text-center border-b border-dashed border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Ticket Ordine</CardTitle>
            </div>
            <Badge variant="outline" className="text-xl px-4 py-2 font-mono bg-background">
              {pickupCode}
            </Badge>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* Date ordine e consegna */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-dashed border-muted">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Data ordine</p>
                  <p className="font-semibold">
                    {format(new Date(order.created_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Consegna prevista</p>
                  <p className="font-semibold">
                    {format(new Date(order.delivery_date), "dd MMM yyyy", { locale: it })}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.time_slot}</p>
                </div>
              </div>
            </div>

            {/* Dettagli in grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</p>
                    <p className="font-semibold">{order.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefono</p>
                    <p className="font-semibold font-mono">{order.customer_phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Indirizzo</p>
                    <p className="font-semibold text-sm">{order.delivery_address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Package className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Supermercato</p>
                    <p className="font-semibold text-sm">{order.store_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {order.deliverer_name && (
              <div className="pt-4 border-t border-dashed border-muted">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Il tuo deliverer</p>
                    <p className="font-semibold text-lg">{order.deliverer_name}</p>
                    {order.deliverer_phone && (
                      <p className="text-sm text-muted-foreground font-mono">{order.deliverer_phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Stato della consegna</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusTracker currentStatus={order.delivery_status || 'confirmed'} />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(canEditOrder || canCancelOrder) && (
          <Card>
            <CardHeader>
              <CardTitle>Azioni ordine</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              {canEditOrder && (
                <Button 
                  onClick={handleEditOrder}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica ordine
                </Button>
              )}
              
              {canCancelOrder && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancella ordine
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione cancellerà definitivamente il tuo ordine. 
                        Non potrai più recuperarlo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelOrder}>
                        Cancella ordine
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chat */}
        <OrderChat 
          orderId={order.id}
          customerName={order.customer_name}
          delivererName={order.deliverer_name}
        />
      </div>

      <Navigation />
    </div>
  );
};

export default OrderTracking;
