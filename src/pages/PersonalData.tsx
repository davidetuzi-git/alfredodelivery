import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Bell, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { UserSubmenu } from "@/components/UserSubmenu";
import { Navigation } from "@/components/Navigation";
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

interface CommunicationPreferences {
  order_updates: boolean;
  promotions: boolean;
  newsletter: boolean;
  loyalty_updates: boolean;
  new_features: boolean;
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
  const [commPrefs, setCommPrefs] = useState<CommunicationPreferences>({
    order_updates: true,
    promotions: true,
    newsletter: false,
    loyalty_updates: true,
    new_features: true
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

      // Load profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
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

      // Load communication preferences
      const { data: prefs } = await supabase
        .from('communication_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefs) {
        setCommPrefs({
          order_updates: prefs.order_updates,
          promotions: prefs.promotions,
          newsletter: prefs.newsletter,
          loyalty_updates: prefs.loyalty_updates,
          new_features: prefs.new_features
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
      // Save profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Save communication preferences
      const { error: prefsError } = await supabase
        .from('communication_preferences')
        .upsert({
          user_id: userId,
          ...commPrefs,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (prefsError) throw prefsError;

      toast({
        title: "Salvato!",
        description: "I tuoi dati e preferenze sono stati aggiornati con successo",
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

  const updateCommPref = (field: keyof CommunicationPreferences, value: boolean) => {
    setCommPrefs(prev => ({ ...prev, [field]: value }));
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
      <Header />
      <UserSubmenu />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
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

        {/* Communication Preferences */}
        <Card className="mt-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Preferenze di Comunicazione
            </CardTitle>
            <CardDescription>
              Scegli quali comunicazioni desideri ricevere via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="order_updates" className="font-medium">Aggiornamenti Ordini e Servizio</Label>
                <p className="text-xs text-muted-foreground">
                  Ricevi notifiche su stato ordini, date bloccate e comunicazioni operative
                </p>
              </div>
              <Switch
                id="order_updates"
                checked={commPrefs.order_updates}
                onCheckedChange={(checked) => updateCommPref('order_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="promotions" className="font-medium">Promozioni e Offerte</Label>
                <p className="text-xs text-muted-foreground">
                  Ricevi sconti esclusivi, codici promozionali e offerte speciali
                </p>
              </div>
              <Switch
                id="promotions"
                checked={commPrefs.promotions}
                onCheckedChange={(checked) => updateCommPref('promotions', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="loyalty_updates" className="font-medium">Programma Fedeltà</Label>
                <p className="text-xs text-muted-foreground">
                  Aggiornamenti sui tuoi punti, livello e premi disponibili
                </p>
              </div>
              <Switch
                id="loyalty_updates"
                checked={commPrefs.loyalty_updates}
                onCheckedChange={(checked) => updateCommPref('loyalty_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="new_features" className="font-medium">Novità e Funzionalità</Label>
                <p className="text-xs text-muted-foreground">
                  Scopri nuove funzionalità, miglioramenti e aggiornamenti della piattaforma
                </p>
              </div>
              <Switch
                id="new_features"
                checked={commPrefs.new_features}
                onCheckedChange={(checked) => updateCommPref('new_features', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="newsletter" className="font-medium">Newsletter</Label>
                <p className="text-xs text-muted-foreground">
                  Ricette, consigli e contenuti interessanti dal mondo della spesa
                </p>
              </div>
              <Switch
                id="newsletter"
                checked={commPrefs.newsletter}
                onCheckedChange={(checked) => updateCommPref('newsletter', checked)}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Le comunicazioni operative (date bloccate, chiusure servizio) vengono inviate solo se hai attivato "Aggiornamenti Ordini e Servizio"
                </p>
              </div>
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
      <Navigation />
    </div>
  );
};

export default PersonalData;
