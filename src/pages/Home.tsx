import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, TrendingUp, Gift } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const Home = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState<string>("Utente");
  const [orders, setOrders] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSaved: 0,
    activeVouchers: 0
  });

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, first_name, full_name")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          // Usa first_name se disponibile, altrimenti full_name, altrimenti "Utente"
          const displayName = profile.first_name || profile.full_name || "Utente";
          setUserName(displayName);
          
          if (!profile.onboarding_completed) {
            navigate("/onboarding");
          } else {
            // Carica dati reali solo se l'onboarding è completato
            await loadUserData(session.user.id);
          }
        }
      }
    };

    checkOnboarding();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    // Carica ordini dell'utente
    const { data: userOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (userOrders) {
      setOrders(userOrders);
    }

    // Calcola statistiche
    const { data: allOrders } = await supabase
      .from("orders")
      .select("total_amount, discount, voucher_discount")
      .eq("user_id", userId);

    if (allOrders) {
      const totalOrders = allOrders.length;
      const totalSaved = allOrders.reduce((sum, order) => 
        sum + (order.discount || 0) + (order.voucher_discount || 0), 0
      );
      
      setStats({
        totalOrders,
        totalSaved: Math.round(totalSaved * 100) / 100,
        activeVouchers: 0 // Sarà aggiornato dopo
      });
    }

    // Carica voucher attivi
    const { data: activeVouchers } = await supabase
      .from("vouchers")
      .select("*")
      .eq("active", true)
      .gte("valid_until", new Date().toISOString())
      .lte("valid_from", new Date().toISOString())
      .order("valid_until", { ascending: true })
      .limit(3);

    if (activeVouchers) {
      setVouchers(activeVouchers);
      setStats(prev => ({ ...prev, activeVouchers: activeVouchers.length }));
    }
  };

  const handleOrderClick = () => {
    if (!session) {
      navigate("/auth");
    } else {
      navigate("/ordina");
    }
  };

  const handleUseVoucher = (voucherCode: string) => {
    navigate("/ordina", { state: { voucherCode } });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'confirmed': 'Confermato',
      'assigned': 'Assegnato',
      'at_store': 'Al supermercato',
      'shopping_complete': 'Spesa completata',
      'on_the_way': 'In consegna',
      'delivered': 'Consegnato',
      'cancelled': 'Cancellato'
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'delivered') return 'default';
    if (status === 'cancelled') return 'destructive';
    return 'secondary';
  };

  const calculateDaysUntilExpiry = (validUntil: string) => {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Oggi";
    if (diffDays === 1) return "1 giorno";
    if (diffDays < 7) return `${diffDays} giorni`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return "1 settimana";
    return `${weeks} settimane`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Ciao, {userName}!</h1>
              <p className="text-muted-foreground">Benvenuto su ALFREDO</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                Cliente Gold
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-xs text-muted-foreground">Ordini totali</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">€{stats.totalSaved.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Risparmiati</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Gift className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.activeVouchers}</div>
                <div className="text-xs text-muted-foreground">Offerte attive</div>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={handleOrderClick}
            className="w-full h-12 text-lg"
          >
            Nuovo Ordine Rapido
          </Button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-6 space-y-6">
        {vouchers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Offerte per te
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vouchers.map((voucher) => (
                <div key={voucher.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      {voucher.discount_type === 'percentage' 
                        ? `Sconto ${voucher.discount_value}%` 
                        : `Sconto €${voucher.discount_value}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {voucher.description || `Codice: ${voucher.code}`} • Scade tra {calculateDaysUntilExpiry(voucher.valid_until)}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleUseVoucher(voucher.code)}
                  >
                    Usa ora
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {orders.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Storico ordini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate('/my-orders')}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{order.store_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "d MMM yyyy", { locale: it })} • 
                      {Array.isArray(order.items) ? ` ${order.items.length} articoli` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">€{order.total_amount.toFixed(2)}</div>
                    <Badge variant={getStatusVariant(order.delivery_status)} className="text-xs">
                      {getStatusLabel(order.delivery_status)}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/my-orders')}
              >
                Vedi tutti gli ordini
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Storico ordini
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">Non hai ancora effettuato ordini</p>
              <Button onClick={handleOrderClick}>Fai il tuo primo ordine</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Home;
