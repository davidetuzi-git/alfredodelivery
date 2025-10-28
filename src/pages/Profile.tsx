import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { User, MapPin, CreditCard, Bell, Settings, LogOut, Star, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  
  const menuItems = [
    { icon: User, label: "Dati personali", action: () => navigate("/dati-personali") },
    { icon: MapPin, label: "Indirizzi salvati", action: () => {} },
    { icon: CreditCard, label: "Metodi di pagamento", action: () => {} },
    { icon: Store, label: "Segnala supermercato", action: () => navigate("/segnala-supermercato") },
    { icon: Bell, label: "Notifiche", action: () => {} },
    { icon: Settings, label: "Impostazioni", action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">M</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1">Mario Bianchi</h1>
              <p className="text-muted-foreground">mario.bianchi@email.com</p>
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
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={item.action}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
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

        <Button variant="outline" className="w-full" size="lg">
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </div>

      <Navigation />
    </div>
  );
};

export default Profile;
