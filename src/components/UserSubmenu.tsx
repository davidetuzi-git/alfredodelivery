import { User, MapPin, CreditCard, Bell, ShoppingBag, Crown, Gift, Store, Home, PlusCircle, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { icon: Home, label: "Start", path: "/home" },
  { icon: PlusCircle, label: "Nuovo Ordine", path: "/ordina" },
  { icon: ShoppingBag, label: "Ordini", path: "/i-miei-ordini" },
  { icon: Wallet, label: "Carte Fedeltà", path: "/carte-fedelta" },
  { icon: Gift, label: "Fedeltà", path: "/fedelta" },
  { icon: Crown, label: "Alfredo Extra", path: "/abbonamenti" },
  { icon: User, label: "Dati personali", path: "/dati-personali" },
  { icon: MapPin, label: "Indirizzi", path: "/indirizzi-salvati" },
  { icon: CreditCard, label: "Pagamenti", path: "/metodi-pagamento" },
  { icon: Store, label: "Segnala", path: "/segnala-supermercato" },
  { icon: Bell, label: "Notifiche", path: "/notifiche" },
];

export const UserSubmenu = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <div className="bg-muted/50 border-b">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-4 py-2 min-w-max">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isNotifications = item.path === "/notifiche";
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
