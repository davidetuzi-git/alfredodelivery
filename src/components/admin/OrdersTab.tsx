import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, MapPin, Calendar, ShoppingBag, Package, Eye, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OrderDetailDialog } from "./OrderDetailDialog";

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
  pickup_code: string;
}

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
}

interface OrdersTabProps {
  orders: Order[];
  deliverers: Deliverer[];
  onOrderUpdate: () => void;
}

export const OrdersTab = ({ orders, deliverers, onOrderUpdate }: OrdersTabProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
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

    // Send notification to deliverer
    try {
      const { error: notifyError } = await supabase.functions.invoke(
        "notify-manual-assignment",
        {
          body: {
            orderId,
            delivererId,
          },
        }
      );

      if (notifyError) {
        console.error("Error sending notification:", notifyError);
        toast.warning(`Ordine assegnato a ${deliverer.name}, ma notifica non inviata`);
      } else {
        toast.success(`Ordine assegnato a ${deliverer.name} e notificato su Telegram`);
      }
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
      toast.warning(`Ordine assegnato a ${deliverer.name}, ma notifica non inviata`);
    }

    onOrderUpdate();
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: "Programmato",
      in_preparation: "In Preparazione",
      ready_for_pickup: "Pronto",
      in_transit: "In Consegna",
      delivered: "Consegnato",
    };
    return labels[status] || status;
  };

  const filterByStatus = (status: string) => {
    const now = new Date();
    let filteredOrders = orders;
    
    // Apply status filter
    if (status === "scheduled") filteredOrders = orders.filter(o => o.delivery_status === "confirmed");
    else if (status === "in_transit") filteredOrders = orders.filter(o => o.delivery_status === "in_transit");
    else if (status === "delivered") filteredOrders = orders.filter(o => o.delivery_status === "delivered");
    else if (status === "expired") {
      filteredOrders = orders.filter(o => {
        const deliveryDate = new Date(o.delivery_date);
        return deliveryDate < now && o.deliverer_id === null && o.delivery_status === "confirmed";
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredOrders = filteredOrders.filter(order => 
        order.pickup_code.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_phone.includes(query) ||
        order.delivery_address.toLowerCase().includes(query) ||
        order.store_name.toLowerCase().includes(query)
      );
    }
    
    return filteredOrders;
  };

  return (
    <div className="space-y-4">
      {/* Barra di ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cerca ordine per codice pickup, cliente, telefono, indirizzo o negozio..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Tutti ({filterByStatus("all").length})</TabsTrigger>
          <TabsTrigger value="scheduled">
            Programmati ({filterByStatus("scheduled").length})
          </TabsTrigger>
          <TabsTrigger value="in_transit">
            In Consegna ({filterByStatus("in_transit").length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Consegnati ({filterByStatus("delivered").length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Scaduti ({filterByStatus("expired").length})
          </TabsTrigger>
        </TabsList>

      {["all", "scheduled", "in_transit", "delivered", "expired"].map((tabValue) => (
        <TabsContent key={tabValue} value={tabValue} className="space-y-4">
          {filterByStatus(tabValue).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "Nessun ordine trovato con questa ricerca" : "Nessun ordine in questa categoria"}
            </p>
          ) : (
            filterByStatus(tabValue).map((order) => (
              <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3 flex-1" onClick={() => {
                      setSelectedOrder(order);
                      setDialogOpen(true);
                    }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className={getStatusColor(order.delivery_status)}>
                            {getStatusLabel(order.delivery_status)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            #{order.pickup_code}
                          </p>
                        </div>
                        <p className="text-xl font-bold">€{order.total_amount}</p>
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
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{order.deliverer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.deliverer_phone}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-64 space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vedi Dettagli
                      </Button>
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
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{deliverer.name}</span>
                                <Badge variant="outline">
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
        </TabsContent>
      ))}
      
      <OrderDetailDialog 
        order={selectedOrder} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </Tabs>
    </div>
  );
};
