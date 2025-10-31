import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { Package, Clock, MapPin, ShoppingBag, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Session } from "@supabase/supabase-js";

interface Order {
  id: string;
  pickup_code: string;
  customer_name: string;
  delivery_address: string;
  store_name: string;
  delivery_status: string;
  delivery_date: string;
  time_slot: string;
  total_amount: number;
  created_at: string;
  deliverer_name: string | null;
}

const MyOrders = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
                onClick={() =>
                  navigate("/tracking", { state: { pickupCode: order.pickup_code } })
                }
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
                    Traccia ordine
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
                onClick={() =>
                  navigate("/tracking", { state: { pickupCode: order.pickup_code } })
                }
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

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" />
                    <span>{order.store_name}</span>
                  </div>
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
              <Button onClick={() => navigate("/order")}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Fai il tuo primo ordine
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default MyOrders;
