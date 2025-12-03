import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { UserSubmenu } from "@/components/UserSubmenu";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Store } from "lucide-react";

const ReportStore = () => {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim() || !address.trim() || !city.trim()) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Send report via edge function
      const { error } = await supabase.functions.invoke('report-store', {
        body: { 
          storeName: storeName.trim(),
          address: address.trim(),
          city: city.trim(),
          notes: notes.trim()
        }
      });

      if (error) throw error;

      toast({
        title: "Segnalazione inviata!",
        description: "Grazie per la tua segnalazione. La esamineremo al più presto.",
      });

      // Reset form
      setStoreName("");
      setAddress("");
      setCity("");
      setNotes("");
      
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la segnalazione. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Segnala Supermercato</h1>
          <p className="text-muted-foreground">Non trovi il tuo supermercato? Segnalacelo!</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Dettagli Supermercato
            </CardTitle>
            <CardDescription>
              Aiutaci ad ampliare la nostra rete di supermercati segnalando quelli mancanti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome Supermercato *</Label>
                <Input
                  id="storeName"
                  placeholder="Es: Conad, Esselunga, Lidl..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo *</Label>
                <Input
                  id="address"
                  placeholder="Es: Via Roma 123"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Città *</Label>
                <Input
                  id="city"
                  placeholder="Es: Roma, Milano, Anzio..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note aggiuntive (opzionale)</Label>
                <Textarea
                  id="notes"
                  placeholder="Aggiungi eventuali informazioni utili sul supermercato..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Suggerimento
                    </div>
                    <div className="text-blue-700 dark:text-blue-300">
                      Più dettagli fornisci (indirizzo completo, catena del supermercato), più velocemente potremo aggiungere il negozio alla nostra rete!
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Invio in corso..." : "Invia Segnalazione"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default ReportStore;
