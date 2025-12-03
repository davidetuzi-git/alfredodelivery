import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { UserSubmenu } from "@/components/UserSubmenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, CreditCard, Camera, Barcode } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";

// Lista predefinita catene supermercati italiane
const STORE_CHAINS = [
  "Conad",
  "Coop",
  "Esselunga",
  "Carrefour",
  "Lidl",
  "Eurospin",
  "Aldi",
  "MD Discount",
  "Penny Market",
  "Despar",
  "Pam",
  "Iper",
  "Bennet",
  "Tigros",
  "Famila",
  "A&O",
  "Sigma",
  "Simply",
  "Todis",
  "Prix",
  "Altro"
];

interface LoyaltyCard {
  id: string;
  store_chain: string;
  barcode: string;
  card_name: string | null;
  created_at: string;
}

const StoreLoyaltyCards = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [newCard, setNewCard] = useState({
    store_chain: "",
    barcode: "",
    card_name: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('store_loyalty_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast.error("Errore nel caricamento delle carte");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeDetected = (barcode: string) => {
    setNewCard(prev => ({ ...prev, barcode }));
    setShowScanner(false);
    toast.success("Barcode acquisito!");
  };

  const handleAddCard = async () => {
    if (!newCard.store_chain || !newCard.barcode) {
      toast.error("Seleziona la catena e inserisci il barcode");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('store_loyalty_cards')
        .insert({
          user_id: user.id,
          store_chain: newCard.store_chain,
          barcode: newCard.barcode,
          card_name: newCard.card_name || null
        });

      if (error) throw error;

      toast.success("Carta fedeltà aggiunta!");
      setShowAddDialog(false);
      setNewCard({ store_chain: "", barcode: "", card_name: "" });
      loadCards();
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error("Errore nell'aggiunta della carta");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('store_loyalty_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast.success("Carta eliminata");
      setCards(cards.filter(c => c.id !== cardId));
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error("Errore nell'eliminazione della carta");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <UserSubmenu />
      
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Carte Fedeltà</h1>
              <p className="text-muted-foreground">
                Gestisci le tue carte fedeltà dei supermercati
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Aggiungi
            </Button>
          </div>

          {cards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nessuna carta fedeltà</h3>
                <p className="text-muted-foreground mb-4">
                  Aggiungi le tue carte fedeltà per farle usare dai nostri shopper
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi la prima carta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cards.map(card => (
                <Card key={card.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{card.store_chain}</h3>
                          {card.card_name && (
                            <p className="text-sm text-muted-foreground">{card.card_name}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                      <Barcode className="h-5 w-5 text-muted-foreground" />
                      <code className="text-sm font-mono flex-1">{card.barcode}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Navigation />

      {/* Dialog aggiunta carta */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi Carta Fedeltà</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Catena Supermercato *</Label>
              <Select
                value={newCard.store_chain}
                onValueChange={(value) => setNewCard(prev => ({ ...prev, store_chain: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona catena" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_CHAINS.map(chain => (
                    <SelectItem key={chain} value={chain}>{chain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Barcode *</Label>
              <div className="flex gap-2">
                <Input
                  value={newCard.barcode}
                  onChange={(e) => setNewCard(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Inserisci o scansiona il barcode"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowScanner(true)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome carta (opzionale)</Label>
              <Input
                value={newCard.card_name}
                onChange={(e) => setNewCard(prev => ({ ...prev, card_name: e.target.value }))}
                placeholder="es. Carta famiglia"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleAddCard} disabled={saving}>
              {saving ? "Salvataggio..." : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default StoreLoyaltyCards;
