import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, TrendingUp, Gift } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (!profile?.onboarding_completed) {
          navigate("/onboarding");
        }
      }
    };

    checkOnboarding();
  }, [navigate]);

  const orderHistory = [
    { id: 1, store: "Esselunga", date: "15 Gen 2025", items: 12, total: "€45.80", status: "Consegnato" },
    { id: 2, store: "Carrefour", date: "10 Gen 2025", items: 8, total: "€32.50", status: "Consegnato" },
    { id: 3, store: "Coop", date: "5 Gen 2025", items: 15, total: "€58.20", status: "Consegnato" },
  ];

  const offers = [
    { id: 1, title: "Sconto 20% su frutta fresca", store: "Esselunga", expires: "3 giorni" },
    { id: 2, title: "2x1 sui prodotti per la casa", store: "Carrefour", expires: "1 settimana" },
    { id: 3, title: "Cashback 5€ sul prossimo ordine", store: "Coop", expires: "2 giorni" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Ciao, Mario!</h1>
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
                <div className="text-2xl font-bold">24</div>
                <div className="text-xs text-muted-foreground">Ordini totali</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">€856</div>
                <div className="text-xs text-muted-foreground">Risparmiati</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Gift className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-muted-foreground">Offerte attive</div>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={() => navigate("/ordina")}
            className="w-full h-12 text-lg"
          >
            Nuovo Ordine Rapido
          </Button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Offerte per te
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {offers.map((offer) => (
              <div key={offer.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{offer.title}</h3>
                  <p className="text-xs text-muted-foreground">{offer.store} • Scade tra {offer.expires}</p>
                </div>
                <Button size="sm" variant="secondary">Usa ora</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Storico ordini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderHistory.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{order.store}</h3>
                  <p className="text-sm text-muted-foreground">{order.date} • {order.items} articoli</p>
                </div>
                <div className="text-right">
                  <div className="font-bold">{order.total}</div>
                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">Vedi tutti gli ordini</Button>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Home;
