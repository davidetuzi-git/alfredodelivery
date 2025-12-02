import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { User, MapPin, CreditCard, Bell, Settings, LogOut, Star, Store, ShoppingBag, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";

const Profile = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || "");
      
      setTimeout(() => {
        supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              setFirstName(data.first_name || "");
              setLastName(data.last_name || "");
            }
          });
      }, 0);
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  
  const menuItems = [
    { icon: ShoppingBag, label: "I miei ordini", action: () => navigate("/i-miei-ordini") },
    { icon: Crown, label: "Alfredo Extra", action: () => navigate("/abbonamenti"), highlight: true },
    { icon: User, label: "Dati personali", action: () => navigate("/dati-personali") },
    { icon: MapPin, label: "Indirizzi salvati", action: () => navigate("/indirizzi-salvati") },
    { icon: CreditCard, label: "Metodi di pagamento", action: () => navigate("/metodi-pagamento") },
    { icon: Store, label: "Segnala supermercato", action: () => navigate("/segnala-supermercato") },
    { icon: Bell, label: "Notifiche", action: () => {} },
    { icon: Settings, label: "Impostazioni", action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {firstName ? firstName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Ciao {firstName || "Utente"}
              </h1>
              <p className="text-muted-foreground">{email}</p>
              <Badge variant="secondary" className="mt-2 flex items-center gap-1 w-fit">
                <Star className="h-3 w-3 fill-primary text-primary" />
                Cliente Gold
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Il mio account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isHighlight = 'highlight' in item && item.highlight;
              return (
                <Button
                  key={index}
                  variant={isHighlight ? "secondary" : "ghost"}
                  className={`w-full justify-start ${isHighlight ? "bg-primary/10 hover:bg-primary/20 text-primary" : ""}`}
                  onClick={item.action}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isHighlight ? "text-primary" : ""}`} />
                  {item.label}
                  {isHighlight && (
                    <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary border-0 text-xs">
                      Nuovo
                    </Badge>
                  )}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold text-primary">24</div>
                <div className="text-sm text-muted-foreground">Ordini totali</div>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold text-primary">€856</div>
                <div className="text-sm text-muted-foreground">Risparmiati</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" size="lg" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>

      <Navigation />
    </div>
  );
};

export default Profile;
