import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, User, ShoppingCart, Crown, Mail, Phone, MapPin, Heart, Bell, Ban, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  preferred_store: string | null;
  created_at: string;
  orders_count: number;
  total_spent: number;
  loyalty_level: string | null;
  loyalty_points: number;
  has_subscription: boolean;
  subscription_plan: string | null;
}

interface CustomerDetails {
  profile: Customer;
  orders: Array<{
    id: string;
    delivery_date: string;
    total_amount: number;
    delivery_status: string;
    store_name: string;
  }>;
  preferences: {
    order_updates: boolean;
    promotions: boolean;
    newsletter: boolean;
    loyalty_updates: boolean;
    new_features: boolean;
  } | null;
}

export const CustomersTab = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [actionCustomerId, setActionCustomerId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.email?.toLowerCase().includes(query) ||
            c.first_name?.toLowerCase().includes(query) ||
            c.last_name?.toLowerCase().includes(query) ||
            c.phone?.includes(query)
        )
      );
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      // Get all profiles with user emails from auth
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get orders aggregated by user
      const { data: ordersAgg, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, total_amount");

      if (ordersError) throw ordersError;

      // Aggregate orders by user
      const orderStats: Record<string, { count: number; total: number }> = {};
      ordersAgg?.forEach((order) => {
        if (!orderStats[order.user_id]) {
          orderStats[order.user_id] = { count: 0, total: 0 };
        }
        orderStats[order.user_id].count++;
        orderStats[order.user_id].total += Number(order.total_amount) || 0;
      });

      // Get loyalty profiles
      const { data: loyaltyProfiles, error: loyaltyError } = await supabase
        .from("loyalty_profiles")
        .select("user_id, current_level, points_balance");

      if (loyaltyError) throw loyaltyError;

      const loyaltyMap: Record<string, { level: string; points: number }> = {};
      loyaltyProfiles?.forEach((lp) => {
        loyaltyMap[lp.user_id] = { level: lp.current_level, points: lp.points_balance };
      });

      // Get subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("user_subscriptions")
        .select("user_id, plan, status")
        .eq("status", "active");

      if (subError) throw subError;

      const subMap: Record<string, string> = {};
      subscriptions?.forEach((sub) => {
        subMap[sub.user_id] = sub.plan;
      });

      // Get user emails from auth (via a workaround - we'll use the profile id which matches auth.users.id)
      // Since we can't directly query auth.users, we'll need to get emails from orders or other sources
      const { data: orderEmails } = await supabase
        .from("orders")
        .select("user_id, customer_name");

      const emailMap: Record<string, string> = {};
      // For now, we'll construct email from profile data or use placeholder

      // Combine all data
      const combinedCustomers: Customer[] = (profiles || []).map((profile) => {
        const stats = orderStats[profile.id] || { count: 0, total: 0 };
        const loyalty = loyaltyMap[profile.id] || { level: "bronze", points: 0 };
        const subscription = subMap[profile.id];

        return {
          id: profile.id,
          email: `${profile.first_name || ""}${profile.last_name ? "." + profile.last_name : ""}@user`.toLowerCase() || profile.id.substring(0, 8),
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          preferred_store: profile.preferred_store,
          created_at: profile.created_at,
          orders_count: stats.count,
          total_spent: stats.total,
          loyalty_level: loyalty.level,
          loyalty_points: loyalty.points,
          has_subscription: !!subscription,
          subscription_plan: subscription || null,
        };
      });

      setCustomers(combinedCustomers);
      setFilteredCustomers(combinedCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", customerId)
        .single();

      // Get orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, delivery_date, total_amount, delivery_status, store_name")
        .eq("user_id", customerId)
        .order("delivery_date", { ascending: false })
        .limit(10);

      // Get communication preferences
      const { data: preferences } = await supabase
        .from("communication_preferences")
        .select("*")
        .eq("user_id", customerId)
        .maybeSingle();

      // Get loyalty
      const { data: loyalty } = await supabase
        .from("loyalty_profiles")
        .select("*")
        .eq("user_id", customerId)
        .maybeSingle();

      // Get subscription
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", customerId)
        .eq("status", "active")
        .maybeSingle();

      const customer = customers.find((c) => c.id === customerId);

      setSelectedCustomer({
        profile: {
          ...customer!,
          loyalty_level: loyalty?.current_level || "bronze",
          loyalty_points: loyalty?.points_balance || 0,
          has_subscription: !!subscription,
          subscription_plan: subscription?.plan || null,
        },
        orders: orders || [],
        preferences: preferences
          ? {
              order_updates: preferences.order_updates,
              promotions: preferences.promotions,
              newsletter: preferences.newsletter,
              loyalty_updates: preferences.loyalty_updates,
              new_features: preferences.new_features,
            }
          : null,
      });
      setDialogOpen(true);
    } catch (error) {
      console.error("Error loading customer details:", error);
    }
  };

  const getLoyaltyBadgeColor = (level: string | null) => {
    switch (level) {
      case "platinum":
        return "bg-purple-500/20 text-purple-700 border-purple-300";
      case "gold":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-300";
      case "silver":
        return "bg-gray-400/20 text-gray-600 border-gray-300";
      default:
        return "bg-orange-500/20 text-orange-700 border-orange-300";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500/20 text-green-700";
      case "on_the_way":
        return "bg-blue-500/20 text-blue-700";
      case "cancelled":
        return "bg-red-500/20 text-red-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  const handleBlockUser = async () => {
    if (!actionCustomerId) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: "blocked" })
        .eq("id", actionCustomerId);

      if (error) throw error;

      toast.success("Utente bloccato con successo");
      setBlockDialogOpen(false);
      setActionCustomerId(null);
      loadCustomers();
      if (selectedCustomer?.profile.id === actionCustomerId) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Errore nel blocco dell'utente");
    }
  };

  const handleDeleteUser = async () => {
    if (!actionCustomerId) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", actionCustomerId);

      if (error) throw error;

      toast.success("Utente eliminato con successo");
      setDeleteDialogOpen(false);
      setActionCustomerId(null);
      loadCustomers();
      if (selectedCustomer?.profile.id === actionCustomerId) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Errore nell'eliminazione dell'utente");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Caricamento clienti...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Database Clienti ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, email o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contatto</TableHead>
                  <TableHead className="text-center">Ordini</TableHead>
                  <TableHead className="text-center">Speso</TableHead>
                  <TableHead className="text-center">Livello</TableHead>
                  <TableHead className="text-center">Abbonamento</TableHead>
                  <TableHead>Registrato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => loadCustomerDetails(customer.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {customer.first_name || customer.last_name
                            ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                            : "N/D"}
                        </p>
                        <p className="text-xs text-muted-foreground">{customer.city || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.orders_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      €{customer.total_spent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getLoyaltyBadgeColor(customer.loyalty_level)}>
                        {customer.loyalty_level || "bronze"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.has_subscription ? (
                        <Badge className="bg-primary/20 text-primary">
                          <Crown className="h-3 w-3 mr-1" />
                          {customer.subscription_plan}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(customer.created_at), "dd MMM yyyy", { locale: it })}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nessun cliente trovato
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dettagli Cliente
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setActionCustomerId(selectedCustomer?.profile.id || null);
                    setBlockDialogOpen(true);
                  }}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Blocca
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setActionCustomerId(selectedCustomer?.profile.id || null);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Elimina
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Info base */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informazioni Personali
                    </h4>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Nome:</span>{" "}
                        {selectedCustomer.profile.first_name} {selectedCustomer.profile.last_name}
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {selectedCustomer.profile.phone || "N/D"}
                      </p>
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {selectedCustomer.profile.address || "N/D"}, {selectedCustomer.profile.city || ""}
                      </p>
                      <p className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        Negozio preferito: {selectedCustomer.profile.preferred_store || "N/D"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Fedeltà & Abbonamento
                    </h4>
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Livello:</span>
                        <Badge className={getLoyaltyBadgeColor(selectedCustomer.profile.loyalty_level)}>
                          {selectedCustomer.profile.loyalty_level}
                        </Badge>
                      </div>
                      <p>
                        <span className="text-muted-foreground">Punti:</span>{" "}
                        {selectedCustomer.profile.loyalty_points}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Abbonamento:</span>
                        {selectedCustomer.profile.has_subscription ? (
                          <Badge className="bg-primary/20 text-primary">
                            <Crown className="h-3 w-3 mr-1" />
                            {selectedCustomer.profile.subscription_plan}
                          </Badge>
                        ) : (
                          <span>Nessuno</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4" />
                    Statistiche Ordini
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{selectedCustomer.profile.orders_count}</p>
                      <p className="text-xs text-muted-foreground">Ordini totali</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">€{selectedCustomer.profile.total_spent.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Spesa totale</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">
                        €{selectedCustomer.profile.orders_count > 0 
                          ? (selectedCustomer.profile.total_spent / selectedCustomer.profile.orders_count).toFixed(2)
                          : "0.00"}
                      </p>
                      <p className="text-xs text-muted-foreground">Media ordine</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Communication Preferences */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4" />
                    Preferenze Comunicazione
                  </h4>
                  {selectedCustomer.preferences ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={selectedCustomer.preferences.order_updates ? "default" : "outline"}>
                        Aggiornamenti ordini
                      </Badge>
                      <Badge variant={selectedCustomer.preferences.promotions ? "default" : "outline"}>
                        Promozioni
                      </Badge>
                      <Badge variant={selectedCustomer.preferences.newsletter ? "default" : "outline"}>
                        Newsletter
                      </Badge>
                      <Badge variant={selectedCustomer.preferences.loyalty_updates ? "default" : "outline"}>
                        Fedeltà
                      </Badge>
                      <Badge variant={selectedCustomer.preferences.new_features ? "default" : "outline"}>
                        Novità
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessuna preferenza impostata</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Orders */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4" />
                    Ultimi Ordini
                  </h4>
                  {selectedCustomer.orders.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                        >
                          <div>
                            <p className="font-medium">{order.store_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.delivery_date), "dd MMM yyyy", { locale: it })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusBadgeColor(order.delivery_status)}>
                              {order.delivery_status}
                            </Badge>
                            <span className="font-medium">€{Number(order.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun ordine</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloccare questo utente?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utente non potrà più accedere alla piattaforma. Questa azione può essere annullata in seguito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Blocca Utente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare definitivamente questo utente?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'utente e tutti i suoi dati associati. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
