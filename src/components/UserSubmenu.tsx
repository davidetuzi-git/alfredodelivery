import { User, MapPin, CreditCard, Bell, ShoppingBag, Crown, Gift, Store, Home, PlusCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const menuItems = [
  { icon: Home, label: "Start", path: "/profilo" },
  { icon: PlusCircle, label: "Nuovo Ordine", path: "/ordina" },
  { icon: ShoppingBag, label: "Ordini", path: "/i-miei-ordini" },
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

  return (
    <div className="bg-muted/50 border-b">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-4 py-2 min-w-max">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
