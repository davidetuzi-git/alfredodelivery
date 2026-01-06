import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowLeft } from "lucide-react";

type AuthMode = "login" | "register" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const returnTo = location.state?.returnTo;
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (profile?.onboarding_completed) {
          navigate(returnTo || "/home");
        } else {
          navigate("/onboarding");
        }
      }
    };

    checkUserAndRedirect();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const returnTo = location.state?.returnTo;
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (profile?.onboarding_completed) {
          navigate(returnTo || "/home");
        } else {
          navigate("/onboarding");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Errore",
            description: error.message.includes("Invalid login credentials") 
              ? "Email o password non corretti" 
              : error.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Accesso effettuato!",
          description: "Benvenuto!",
        });
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name },
          },
        });

        if (error) {
          toast({
            title: "Errore",
            description: error.message.includes("User already registered")
              ? "Questa email è già registrata. Prova ad accedere."
              : error.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Registrazione completata!",
          description: "Accesso effettuato con successo.",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Errore",
        description: "Inserisci la tua email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email inviata!",
        description: "Controlla la tua casella di posta per reimpostare la password.",
      });
      setMode("login");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Accedi";
      case "register": return "Registrati";
      case "forgot": return "Recupera Password";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login": return "Inserisci le tue credenziali per accedere";
      case "register": return "Crea un account per iniziare a ordinare";
      case "forgot": return "Inserisci la tua email per ricevere il link di reset";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla Home
        </Button>
        
        <Card className="w-full">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario.rossi@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Invio in corso..." : "Invia email di reset"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Mario Rossi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario.rossi@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); resetForm(); }}
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                  >
                    Password dimenticata?
                  </button>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Caricamento..." : mode === "login" ? "Accedi" : "Registrati"}
                </Button>
              </form>
            )}
            <div className="mt-4 text-center text-sm space-y-2">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => { setMode("login"); resetForm(); }}
                  className="text-primary hover:underline"
                >
                  Torna al login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); resetForm(); }}
                  className="text-primary hover:underline"
                >
                  {mode === "login"
                    ? "Non hai un account? Registrati"
                    : "Hai già un account? Accedi"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
