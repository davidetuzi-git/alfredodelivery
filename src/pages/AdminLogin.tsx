import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User, KeyRound, Home } from "lucide-react";
import { Link } from "react-router-dom";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error("Accesso negato. Non hai i permessi di amministratore.");
        return;
      }

      toast.success("Accesso effettuato con successo!");
      navigate("/admin/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Errore durante l'accesso");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email) {
      toast.error("Inserisci la tua email prima di richiedere il recupero");
      return;
    }

    setIsRecovering(true);
    try {
      const { error } = await supabase.functions.invoke('admin-password-recovery', {
        body: { adminEmail: email }
      });

      if (error) throw error;

      toast.success("Email di recupero inviata a davide.tuzi@gmail.com");
    } catch (error: any) {
      console.error("Errore recupero password:", error);
      toast.error("Errore nell'invio dell'email di recupero");
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Link 
        to="/" 
        className="fixed top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-5 w-5" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin ALFREDO</CardTitle>
          <CardDescription>
            Accedi al pannello di amministrazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="alfredo@admin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
          
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              type="button"
              variant="outline" 
              className="w-full" 
              onClick={handlePasswordRecovery}
              disabled={isRecovering}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {isRecovering ? "Invio in corso..." : "Recupero Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
