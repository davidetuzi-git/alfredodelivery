import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ALFREDO
            </h3>
            <p className="text-sm text-muted-foreground">
              Il tuo servizio di spesa a domicilio personalizzato e affidabile.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center transition-colors">
                <Facebook className="w-5 h-5 text-primary" />
              </a>
              <a href="#" className="w-10 h-10 bg-secondary/10 hover:bg-secondary/20 rounded-full flex items-center justify-center transition-colors">
                <Instagram className="w-5 h-5 text-secondary" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Servizi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/come-funziona" className="hover:text-primary transition-colors">Come funziona</Link></li>
              <li><Link to="/prezzi" className="hover:text-primary transition-colors">Prezzi</Link></li>
              <li><Link to="/prezzi-policy" className="hover:text-primary transition-colors">Policy Prezzi</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Supermercati partner</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Zone di consegna</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Per Alfredi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/deliverer-dashboard" className="hover:text-secondary transition-colors">Area Fattorini</Link></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Diventa Alfredo</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Requisiti</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Guadagni</a></li>
              <li><Link to="/faq" className="hover:text-secondary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contatti</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Anzio, Italia</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>+39 123 456 7890</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>info@alfredo.it</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ALFREDO. Tutti i diritti riservati.
          </p>
          <Link 
            to="/admin/login" 
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};
