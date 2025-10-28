import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, LogOut, MapPin, Phone, Mail } from "lucide-react";

interface Deliverer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
  zone: string | null;
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

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

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

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('deliverer_id', delivererData.id)
      .order('created_at', { ascending: false });

    if (ordersData) {
      setOrders(ordersData);
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