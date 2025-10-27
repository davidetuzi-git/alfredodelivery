import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, User, Phone, MapPin } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
  });

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          ...formData,
          onboarding_completed: true,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast({
        title: "Profilo completato!",
        description: "Il tuo account è stato configurato con successo.",
      });

      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.full_name || !formData.phone)) {
      toast({
        title: "Attenzione",
        description: "Compila tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && (!formData.address || !formData.city || !formData.postal_code)) {
      toast({
        title: "Attenzione",
        description: "Compila tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {step === 3 ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <User className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl">
              {step === 1 && "Benvenuto su ALFREDO!"}
              {step === 2 && "Dove consegniamo?"}
              {step === 3 && "Tutto pronto!"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Iniziamo con le tue informazioni personali"}
              {step === 2 && "Inserisci l'indirizzo di consegna"}
              {step === 3 && "Il tuo account è configurato"}
            </CardDescription>
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Mario Rossi"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 123 456 7890"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button onClick={nextStep} className="w-full" size="lg">
                Continua
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="Via Roma, 123"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Milano"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">CAP *</Label>
                  <Input
                    id="postal_code"
                    type="text"
                    placeholder="20100"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange("postal_code", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="w-full" size="lg">
                  Indietro
                </Button>
                <Button onClick={nextStep} className="w-full" size="lg">
                  Continua
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="p-6 bg-primary/5 rounded-lg">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Configurazione completata!</h3>
                <p className="text-muted-foreground">
                  Ora puoi iniziare a fare la spesa con ALFREDO.
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full" size="lg" disabled={loading}>
                {loading ? "Completamento..." : "Inizia a ordinare"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
