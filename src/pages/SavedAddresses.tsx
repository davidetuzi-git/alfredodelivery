import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Header } from "@/components/Header";
import { UserSubmenu } from "@/components/UserSubmenu";
import { Navigation } from "@/components/Navigation";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

const SavedAddresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    city: "",
    postal_code: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli indirizzi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('saved_addresses')
        .insert({
          user_id: user.id,
          ...newAddress,
        });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Indirizzo salvato con successo",
      });

      setIsDialogOpen(false);
      setNewAddress({
        label: "",
        address: "",
        city: "",
        postal_code: "",
        latitude: null,
        longitude: null,
      });
      loadAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare l'indirizzo",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Indirizzo eliminato",
      });
      loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'indirizzo",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Reset all to not default
      await supabase
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set selected as default
      const { error } = await supabase
        .from('saved_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Indirizzo predefinito aggiornato",
      });
      loadAddresses();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({
        title: "Errore",
        description: "Impossibile impostare come predefinito",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold">Indirizzi Salvati</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6">
              <Plus className="h-5 w-5 mr-2" />
              Aggiungi nuovo indirizzo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Indirizzo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="label">Etichetta (es: Casa, Lavoro)</Label>
                <Input
                  id="label"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  placeholder="Casa"
                />
              </div>
              <div>
                <Label htmlFor="address">Indirizzo</Label>
                <AddressAutocomplete
                  value={newAddress.address}
                  onSelect={(address, lat, lon) => {
                    setNewAddress({
                      ...newAddress,
                      address,
                      latitude: lat,
                      longitude: lon,
                    });
                  }}
                  placeholder="Inizia a digitare l'indirizzo..."
                />
              </div>
              <div>
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">CAP</Label>
                <Input
                  id="postal_code"
                  value={newAddress.postal_code}
                  onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                />
              </div>
              <Button onClick={handleAddAddress} className="w-full">
                Salva Indirizzo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{address.label}</CardTitle>
                    {address.is_default && (
                      <Star className="h-4 w-4 fill-primary text-primary" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{address.address}</p>
                {address.city && <p className="text-sm text-muted-foreground">{address.city} {address.postal_code}</p>}
                {!address.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
                  >
                    Imposta come predefinito
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {addresses.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessun indirizzo salvato
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default SavedAddresses;