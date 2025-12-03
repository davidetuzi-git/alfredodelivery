import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { UserSubmenu } from "@/components/UserSubmenu";
import { Package, Clock, MapPin, ShoppingBag, Eye, Loader2, Calendar, User, Phone, Star, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Session } from "@supabase/supabase-js";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { OrderFeedbackWithTip } from "@/components/OrderFeedbackWithTip";
import { RepeatOrderDialog } from "@/components/RepeatOrderDialog";

interface Order {
  id: string;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  store_name: string;
  delivery_status: string;
  delivery_date: string;
  time_slot: string;
  total_amount: number;
  delivery_fee: number;
  discount: number;
  voucher_discount: number;
  created_at: string;
  deliverer_id: string | null;
  deliverer_name: string | null;
  deliverer_phone: string | null;
  items: any;
}

const MyOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [repeatOrderOpen, setRepeatOrderOpen] = useState(false);
  const [orderToRepeat, setOrderToRepeat] = useState<Order | null>(null);

  // Get order ID from location state (when navigating from Home)
  const openOrderId = (location.state as { openOrderId?: string })?.openOrderId;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Autenticazione richiesta",
          description: "Devi effettuare l'accesso per vedere i tuoi ordini",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      
      setSession(session);
      loadOrders(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
        loadOrders(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadOrders = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);

      // Check which orders already have feedback
      const orderIds = (data || []).map(o => o.id);
      if (orderIds.length > 0) {
        const { data: feedbackData } = await supabase
          .from("order_feedback")
          .select("order_id")
          .in("order_id", orderIds);
        
        if (feedbackData) {
          setFeedbackGiven(new Set(feedbackData.map(f => f.order_id)));
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i tuoi ordini",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-open order dialog when navigating from Home with a specific order
  useEffect(() => {
    if (openOrderId && orders.length > 0 && !loading) {
      const orderToOpen = orders.find(o => o.id === openOrderId);
      if (orderToOpen) {
        setSelectedOrder(orderToOpen);
        setDialogOpen(true);
        // Clear the state to prevent re-opening on re-renders
        window.history.replaceState({}, document.title);
      }
    }
  }, [openOrderId, orders, loading]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "assigned":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      case "at_store":
        return "bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
      case "shopping_complete":
        return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      case "on_the_way":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "delivered":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confermato";
      case "assigned":
        return "Assegnato";
      case "at_store":
        return "Al Negozio";
      case "shopping_complete":
        return "Spesa Completata";
      case "on_the_way":
        return "In Consegna";
      case "delivered":
        return "Consegnato";
      case "cancelled":
        return "Annullato";
      default:
        return status;
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleRepeatOrder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderToRepeat(order);
    setRepeatOrderOpen(true);
  };

  const calculateSubtotal = (order: Order) => {
    return order.total_amount - order.delivery_fee + order.discount + order.voucher_discount;
  };

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.delivery_status)
  );
  const completedOrders = orders.filter((o) =>
    ["delivered", "cancelled"].includes(o.delivery_status)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">I miei ordini</h1>
          <p className="text-muted-foreground">
            Visualizza tutti i tuoi ordini e il loro stato
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Ordini attivi ({activeOrders.length})
            </h2>
            {activeOrders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOrderClick(order)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="font-mono">{order.pickup_code}</Badge>
                        <Badge className={getStatusColor(order.delivery_status)}>
                          {getStatusLabel(order.delivery_status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ordinato il{" "}
                        {format(new Date(order.created_at), "dd MMM yyyy 'alle' HH:mm", {
                          locale: it,
                        })}
                      </p>
                    </div>
                    <p className="text-2xl font-bold">€{order.total_amount.toFixed(2)}</p>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{order.store_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{order.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Consegna prevista:{" "}
                        {format(new Date(order.delivery_date), "dd MMM yyyy", { locale: it })} -{" "}
                        {order.time_slot}
                      </span>
                    </div>
                  </div>

                  {order.deliverer_name && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        Deliverer: {order.deliverer_name}
                      </p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full mt-4">
                    <Eye className="h-4 w-4 mr-2" />
                    Vedi dettagli
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completed Orders */}
        {completedOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Ordini completati ({completedOrders.length})
            </h2>
            {completedOrders.map((order) => (
              <Card
                key={order.id}
                className="opacity-75 hover:opacity-100 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleOrderClick(order)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          {order.pickup_code}
                        </Badge>
                        <Badge className={getStatusColor(order.delivery_status)}>
                          {getStatusLabel(order.delivery_status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-muted-foreground">
                      €{order.total_amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <ShoppingBag className="h-4 w-4" />
                    <span>{order.store_name}</span>
                  </div>

                  {order.delivery_status === 'delivered' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => handleRepeatOrder(order, e)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Ripeti ordine
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {orders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nessun ordine</h3>
              <p className="text-muted-foreground mb-6">
                Non hai ancora effettuato nessun ordine
              </p>
              <Button onClick={() => navigate("/ordina")}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Fai il tuo primo ordine
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Dettagli Ordine */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Dettagli Ordine</span>
                  <Badge className="font-mono text-lg">{selectedOrder.pickup_code}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status Tracker - Solo per ordini non consegnati */}
                {!['delivered', 'cancelled'].includes(selectedOrder.delivery_status) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Stato Consegna</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OrderStatusTracker 
                        currentStatus={selectedOrder.delivery_status}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Stato Finale per ordini consegnati */}
                {['delivered', 'cancelled'].includes(selectedOrder.delivery_status) && (
                  <Card className={selectedOrder.delivery_status === 'delivered' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'}>
                    <CardContent className="p-6 text-center">
                      <Badge className={getStatusColor(selectedOrder.delivery_status) + ' text-lg py-2 px-4'}>
                        {getStatusLabel(selectedOrder.delivery_status)}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        {format(new Date(selectedOrder.created_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Ticket Ordine */}
                <Card className="border-2 border-dashed border-primary/30">
                  <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      Ticket Ordine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Consegna prevista</p>
                          <p className="font-semibold">
                            {format(new Date(selectedOrder.delivery_date), "dd MMM yyyy", { locale: it })}
                          </p>
                          <p className="text-xs">{selectedOrder.time_slot}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Supermercato</p>
                          <p className="font-semibold">{selectedOrder.store_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                          <p className="font-semibold">{selectedOrder.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Indirizzo</p>
                          <p className="font-semibold text-sm">{selectedOrder.delivery_address}</p>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.deliverer_name && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium text-primary mb-1">
                          Deliverer: {selectedOrder.deliverer_name}
                        </p>
                        {selectedOrder.deliverer_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedOrder.deliverer_phone}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Lista della Spesa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Lista della Spesa ({selectedOrder.items?.length || 0} articoli)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      <div className="space-y-2">
                        {selectedOrder.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-semibold">
                                {item.quantity} {item.unit || 'x'}
                              </p>
                              {item.price && (
                                <p className="text-xs text-muted-foreground">
                                  €{(item.price * item.quantity).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Nessun articolo disponibile
                      </p>
                    )}

                    {/* Riepilogo Costi */}
                    <div className="mt-6 pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotale</span>
                        <span>€{calculateSubtotal(selectedOrder).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo consegna</span>
                        <span>€{selectedOrder.delivery_fee.toFixed(2)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Sconto</span>
                          <span>-€{selectedOrder.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.voucher_discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Sconto voucher</span>
                          <span>-€{selectedOrder.voucher_discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Totale</span>
                        <span>€{selectedOrder.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pulsante Traccia solo per ordini attivi */}
                {!['delivered', 'cancelled'].includes(selectedOrder.delivery_status) && (
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setDialogOpen(false);
                      navigate("/tracking", { state: { pickupCode: selectedOrder.pickup_code } });
                    }}
                  >
                    Traccia ordine in tempo reale
                  </Button>
                )}

                {/* Repeat Order Button for delivered orders */}
                {selectedOrder.delivery_status === 'delivered' && (
                  <Button 
                    variant="default"
                    className="w-full"
                    onClick={() => {
                      setDialogOpen(false);
                      setOrderToRepeat(selectedOrder);
                      setRepeatOrderOpen(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ripeti questo ordine
                  </Button>
                )}

                {/* Feedback Section for delivered orders */}
                {selectedOrder.delivery_status === 'delivered' && selectedOrder.deliverer_id && (
                  <>
                    {feedbackGiven.has(selectedOrder.id) ? (
                      <Card className="bg-green-50 dark:bg-green-950/20 border-green-500/30">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                            <Star className="h-5 w-5 fill-current" />
                            <span className="font-medium">Grazie per il tuo feedback!</span>
                          </div>
                        </CardContent>
                      </Card>
                    ) : showFeedback ? (
                      <OrderFeedbackWithTip
                        orderId={selectedOrder.id}
                        delivererId={selectedOrder.deliverer_id}
                        delivererName={selectedOrder.deliverer_name || "Il rider"}
                        onComplete={() => {
                          setFeedbackGiven(prev => new Set([...prev, selectedOrder.id]));
                          setShowFeedback(false);
                        }}
                      />
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowFeedback(true)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Valuta la consegna e lascia una mancia
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Repeat Order Dialog */}
      <RepeatOrderDialog
        open={repeatOrderOpen}
        onOpenChange={setRepeatOrderOpen}
        order={orderToRepeat}
        session={session}
      />

      <Navigation />
    </div>
  );
};

export default MyOrders;
