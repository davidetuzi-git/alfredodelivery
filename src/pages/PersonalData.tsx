import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { stores } from "@/components/SupermarketMap";

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  allergies: string;
  dietary_preferences: string;
  delivery_notes: string;
  preferred_store: string;
}

const PersonalData = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    phone: "",
    allergies: "",
    dietary_preferences: "",
    delivery_notes: "",
    preferred_store: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Errore",
          description: "Devi effettuare l'accesso",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading profile:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati del profilo",
          variant: "destructive",
        });
      } else if (profile) {
        setProfileData({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          phone: profile.phone || "",
          allergies: profile.allergies || "",
          dietary_preferences: profile.dietary_preferences || "",
          delivery_notes: profile.delivery_notes || "",
          preferred_store: profile.preferred_store || ""
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Salvato!",
        description: "I tuoi dati sono stati aggiornati con successo",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare i dati",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/profilo")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al profilo
          </Button>
          <h1 className="text-3xl font-bold mb-2">Dati personali</h1>
          <p className="text-muted-foreground">Gestisci le tue informazioni personali</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni di base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome</Label>
                <Input
                  id="first_name"
                  placeholder="Mario"
                  value={profileData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Cognome</Label>
                <Input
                  id="last_name"
                  placeholder="Rossi"
                  value={profileData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="333 123 4567"
                value={profileData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_store">Supermercato preferito</Label>
              <Select 
                value={profileData.preferred_store || "none"} 
                onValueChange={(value) => updateField('preferred_store', value === "none" ? "" : value)}
              >
                <SelectTrigger id="preferred_store">
                  <SelectValue placeholder="Nessun supermercato preferito" />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {stores.map((store) => {
                    const storeName = `${store.name} - ${store.address}`;
                    return (
                      <SelectItem key={storeName} value={storeName}>
                        {storeName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quando fai un ordine, questo negozio verrà selezionato automaticamente
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Preferenze alimentari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergie e intolleranze</Label>
              <Textarea
                id="allergies"
                placeholder="Es: Lattosio, glutine, frutta a guscio..."
                value={profileData.allergies}
                onChange={(e) => updateField('allergies', e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Specifica eventuali allergie o intolleranze per aiutarci a suggerirti i prodotti più adatti
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary_preferences">Preferenze dietetiche</Label>
              <Textarea
                id="dietary_preferences"
                placeholder="Es: Vegetariano, vegano, biologico, senza zuccheri aggiunti..."
                value={profileData.dietary_preferences}
                onChange={(e) => updateField('dietary_preferences', e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Indica le tue preferenze alimentari (vegetariano, vegano, biologico, ecc.)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Note per le consegne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="delivery_notes">Note aggiuntive</Label>
              <Textarea
                id="delivery_notes"
                placeholder="Es: Consegna al piano terra, citofono nome diverso, note particolari per il corriere..."
                value={profileData.delivery_notes}
                onChange={(e) => updateField('delivery_notes', e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Inserisci eventuali note utili per il corriere (citofono, piano, orari preferiti, ecc.)
              </p>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full mt-6"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salva modifiche
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PersonalData;
