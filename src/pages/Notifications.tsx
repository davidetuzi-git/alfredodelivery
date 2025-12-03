import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { UserSubmenu } from "@/components/UserSubmenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Package, Gift, Percent, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Notifications = () => {
  // Mock notifications - in production these would come from database
  const notifications = [
    {
      id: 1,
      type: "order",
      title: "Ordine in consegna",
      message: "Il tuo ordine #ABC123 è in arrivo!",
      time: "2 ore fa",
      read: false,
      icon: Package,
    },
    {
      id: 2,
      type: "promo",
      title: "Nuova promozione",
      message: "Sconto del 20% sulla prossima consegna!",
      time: "1 giorno fa",
      read: false,
      icon: Percent,
    },
    {
      id: 3,
      type: "loyalty",
      title: "Punti fedeltà",
      message: "Hai guadagnato 50 punti con il tuo ultimo ordine",
      time: "2 giorni fa",
      read: true,
      icon: Gift,
    },
    {
      id: 4,
      type: "info",
      title: "Benvenuto su Alfredo!",
      message: "Grazie per esserti registrato. Inizia a ordinare!",
      time: "1 settimana fa",
      read: true,
      icon: Info,
    },
  ];

  const getIconColor = (type: string) => {
    switch (type) {
      case "order": return "text-blue-500 bg-blue-500/10";
      case "promo": return "text-green-500 bg-green-500/10";
      case "loyalty": return "text-amber-500 bg-amber-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Notifiche</h1>
          <Badge variant="secondary" className="ml-auto">
            {notifications.filter(n => !n.read).length} nuove
          </Badge>
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card 
                key={notification.id} 
                className={`transition-colors ${!notification.read ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium">{notification.title}</h3>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna notifica</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Notifications;
