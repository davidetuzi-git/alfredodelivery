import { Home, ShoppingCart, Clock, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/ordina", icon: ShoppingCart, label: "Ordina" },
    { path: "/tracking", icon: Clock, label: "Ordini" },
    { path: "/prezzi", icon: Search, label: "Prezzi" },
    { path: "/profilo", icon: User, label: "Profilo" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
