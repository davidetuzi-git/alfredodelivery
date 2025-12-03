import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Send, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const requestSchema = z.object({
  firstName: z.string().min(2, "Il nome deve avere almeno 2 caratteri").max(50),
  lastName: z.string().min(2, "Il cognome deve avere almeno 2 caratteri").max(50),
  email: z.string().email("Inserisci un'email valida").max(255),
  phone: z.string().min(10, "Inserisci un numero di telefono valido").max(20),
  city: z.string().min(2, "Inserisci la città").max(100),
  area: z.string().max(500).optional(),
});

const RequestZone = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    area: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = requestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      // Save to database
      const { error } = await supabase
        .from('zone_requests')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          area: formData.area || null,
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Richiesta inviata con successo!");
    } catch (error) {
      console.error('Error submitting zone request:', error);
      toast.error("Errore nell'invio della richiesta. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Grazie per la tua richiesta!</h2>
              <p className="text-muted-foreground mb-6">
                Abbiamo ricevuto la tua segnalazione per la zona di <strong>{formData.city}</strong>. 
                Ti contatteremo appena il servizio sarà disponibile nella tua area.
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla home
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Richiedi il Servizio nella tua Zona</h1>
            <p className="text-muted-foreground text-lg">
              Il nostro servizio non è ancora attivo nella tua zona? Segnalacelo! 
              Siamo sempre interessati ad espanderci in nuove aree.
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Compila il modulo</CardTitle>
              <CardDescription>
                Inserisci i tuoi dati e la zona in cui vorresti il servizio. 
                Ti contatteremo non appena saremo operativi nella tua area.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Mario"
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Cognome *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Rossi"
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="mario.rossi@email.com"
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+39 333 1234567"
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Città desiderata *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Es: Milano, Roma, Napoli..."
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && (
                    <p className="text-xs text-red-500">{errors.city}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Zona/Quartiere specifico (opzionale)</Label>
                  <Textarea
                    id="area"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="Es: Centro storico, Zona Navigli, Quartiere EUR..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Indica il quartiere o la zona specifica dove vorresti il servizio
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    "Invio in corso..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Invia Richiesta
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  I tuoi dati saranno trattati nel rispetto della privacy e utilizzati 
                  esclusivamente per comunicarti la disponibilità del servizio.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RequestZone;
