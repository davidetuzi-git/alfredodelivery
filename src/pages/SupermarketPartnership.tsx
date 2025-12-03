import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, Building2, User, Mail, Phone, MapPin, MessageSquare, CheckCircle2 } from "lucide-react";

const SupermarketPartnership = () => {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [storeCount, setStoreCount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim() || !contactName.trim() || !email.trim() || !phone.trim() || !city.trim()) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Errore",
        description: "Inserisci un indirizzo email valido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('supermarket-partnership-contact', {
        body: { 
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          storeCount: storeCount.trim(),
          message: message.trim()
        }
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Richiesta inviata!",
        description: "Ti contatteremo al più presto.",
      });
    } catch (error) {
      console.error('Error sending partnership request:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la richiesta. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Richiesta Inviata!</h2>
              <p className="text-muted-foreground mb-6">
                Grazie per il tuo interesse. Il nostro team ti contatterà entro 48 ore lavorative per discutere le opportunità di partnership.
              </p>
              <Button onClick={() => navigate("/")}>
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold">Partnership Supermercati</h1>
          </div>
          <p className="text-muted-foreground">
            Diventa partner di ALFREDO e offri ai tuoi clienti un servizio di consegna a domicilio eccezionale
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Benefits */}
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-green-800 dark:text-green-200">Vantaggi della Partnership</h3>
            <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Incremento delle vendite grazie alla consegna a domicilio</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Nessun costo di setup o commissioni nascoste</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Visibilità sulla piattaforma ALFREDO</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Supporto dedicato e formazione del personale</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Richiedi Informazioni
            </CardTitle>
            <CardDescription>
              Compila il form e ti contatteremo per discutere le opportunità di collaborazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nome Attività / Catena *
                </Label>
                <Input
                  id="businessName"
                  placeholder="Es: Supermercati Rossi S.r.l."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Referente *
                  </Label>
                  <Input
                    id="contactName"
                    placeholder="Nome e Cognome"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefono *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Es: +39 333 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@azienda.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Città / Zone di Interesse *
                  </Label>
                  <Input
                    id="city"
                    placeholder="Es: Roma, Anzio, Nettuno"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeCount">
                    Numero Punti Vendita
                  </Label>
                  <Input
                    id="storeCount"
                    placeholder="Es: 3"
                    value={storeCount}
                    onChange={(e) => setStoreCount(e.target.value)}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messaggio (opzionale)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Raccontaci della tua attività e delle tue esigenze..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Invio in corso..." : "Invia Richiesta di Partnership"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default SupermarketPartnership;
