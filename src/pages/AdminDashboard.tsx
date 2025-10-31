import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Package, Users, TrendingUp, Bell, MapPin } from "lucide-react";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { DeliverersTab } from "@/components/admin/DeliverersTab";
import { FinanceTab } from "@/components/admin/FinanceTab";
import { NotificationsTab } from "@/components/admin/NotificationsTab";
import { AddressRequestsTab } from "@/components/admin/AddressRequestsTab";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
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

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Ordini</span>
            </TabsTrigger>
            <TabsTrigger value="deliverers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Deliverers</span>
            </TabsTrigger>
            <TabsTrigger value="address-requests" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Indirizzi</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Finanze</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab 
              orders={orders} 
              deliverers={deliverers}
              onOrderUpdate={loadOrders}
            />
          </TabsContent>

          <TabsContent value="deliverers">
            <DeliverersTab deliverers={deliverers} />
          </TabsContent>

          <TabsContent value="address-requests">
            <AddressRequestsTab onUpdate={loadDeliverers} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab orders={orders} />
          </TabsContent>

          <TabsContent value="finance">
            <FinanceTab orders={orders} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
