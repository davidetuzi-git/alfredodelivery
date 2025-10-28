import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Package, User, Phone, MapPin, Clock, Calendar, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  store_name: string;
  delivery_status: string;
  delivery_date: string;
  time_slot: string;
  total_amount: number;
  deliverer_id: string | null;
  deliverer_name: string | null;
  deliverer_phone: string | null;
  created_at: string;
}

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin/login");
        return;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Accesso negato");
        navigate("/admin/login");
        return;
      }

      setIsAdmin(true);
      await loadOrders();
      await loadDeliverers();
    } catch (error) {
      console.error("Error:", error);
      navigate("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Errore nel caricamento degli ordini");
      return;
    }

    setOrders(data || []);
  };

  const loadDeliverers = async () => {
    const { data, error } = await supabase
      .from("deliverers")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Errore nel caricamento dei fattorini");
      return;
    }

    setDeliverers(data || []);
  };

  const assignDeliverer = async (orderId: string, delivererId: string) => {
    const deliverer = deliverers.find(d => d.id === delivererId);
    if (!deliverer) return;

    const { error } = await supabase
      .from("orders")
      .update({
        deliverer_id: deliverer.id,
        deliverer_name: deliverer.name,
        deliverer_phone: deliverer.phone,
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Errore nell'assegnazione del fattorino");
      return;
    }

    toast.success(`Ordine assegnato a ${deliverer.name}`);
    await loadOrders();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      in_preparation: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      ready_for_pickup: "bg-purple-500/10 text-purple-700 border-purple-500/20",
      in_transit: "bg-orange-500/10 text-orange-700 border-orange-500/20",
      delivered: "bg-green-500/10 text-green-700 border-green-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard ALFREDO</h1>
            <p className="text-sm text-muted-foreground">Gestione ordini e fattorini</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ordini ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nessun ordine presente</p>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <Badge className={getStatusColor(order.delivery_status)}>
                                  {order.delivery_status.replace(/_/g, " ")}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Ordine #{order.id.slice(0, 8)}
                                </p>
                              </div>
                              <p className="text-lg font-bold">€{order.total_amount}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">{order.customer_name}</p>
                                  <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <p className="text-sm">{order.delivery_address}</p>
                              </div>

                              <div className="flex items-start gap-2">
                                <ShoppingBag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <p className="text-sm">{order.store_name}</p>
                              </div>

                              <div className="flex items-start gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm">
                                    {format(new Date(order.delivery_date), "dd MMM yyyy", { locale: it })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{order.time_slot}</p>
                                </div>
                              </div>
                            </div>

                            {order.deliverer_name && (
                              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                                <User className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-sm font-medium">{order.deliverer_name}</p>
                                  <p className="text-xs text-muted-foreground">{order.deliverer_phone}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="md:w-64">
                            <Select
                              value={order.deliverer_id || ""}
                              onValueChange={(value) => assignDeliverer(order.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Assegna fattorino" />
                              </SelectTrigger>
                              <SelectContent>
                                {deliverers.map((deliverer) => (
                                  <SelectItem key={deliverer.id} value={deliverer.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{deliverer.name}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {deliverer.current_orders}/{deliverer.max_orders}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
