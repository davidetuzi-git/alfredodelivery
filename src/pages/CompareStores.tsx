import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ShoppingItem {
  name: string;
  price: number | null;
  quantity: number;
}

const CompareStores = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = (location.state?.items || []) as ShoppingItem[];
  const currentStore = location.state?.currentStore || "";
  
  const [compareStore, setCompareStore] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<{
    current: { store: string; total: number; items: Array<{ name: string; price: number; quantity: number }> };
    compare: { store: string; total: number; items: Array<{ name: string; price: number; quantity: number }> };
  } | null>(null);

  const stores = [
    "Esselunga - Via Tuscolana 123, Roma",
    "Carrefour Express - Via Appia Nuova 45, Roma",
    "Coop - Via dei Castani 67, Roma",
    "Conad - Viale Manzoni 89, Roma",
    "Lidl - Via Casilina 234, Roma",
    "Conad - Via Nettunense 255, Anzio",
    "Lidl - Via Ardeatina 574, Anzio",
    "MD Discount - Via di Villa Claudia 90, Anzio",
    "Conad - Via Monte Velino 15, Avezzano",
    "Eurospin - Via Corradini 34, Avezzano",
    "Tigre - Via Tiburtina Valeria 168, Avezzano",
  ].filter(s => s !== currentStore);

  const handleCompare = async () => {
    if (!compareStore) {
      toast({
        title: "Errore",
        description: "Seleziona un supermercato da confrontare",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => item.name.trim() !== "" && item.price !== null);
    
    if (validItems.length === 0) {
      toast({
        title: "Nessun prodotto",
        description: "Aggiungi almeno un prodotto per confrontare i prezzi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const currentItems = validItems.map(item => ({
        name: item.name,
        price: item.price!,
        quantity: item.quantity
      }));
      
      const compareItems: Array<{ name: string; price: number; quantity: number }> = [];
      
      for (const item of validItems) {
        const { data, error } = await supabase.functions.invoke('search-product-price', {
          body: { 
            product: item.name.trim(),
            storeName: compareStore 
          }
        });

        if (!error && data?.price && !data?.needsDetails) {
          compareItems.push({
            name: item.name,
            price: data.price,
            quantity: item.quantity
          });
        } else {
          compareItems.push({
            name: item.name,
            price: item.price || 0,
            quantity: item.quantity
          });
        }
      }

      const currentTotal = currentItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const compareTotal = compareItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      setComparison({
        current: {
          store: currentStore,
          total: currentTotal,
          items: currentItems
        },
        compare: {
          store: compareStore,
          total: compareTotal,
          items: compareItems
        }
      });
    } catch (error) {
      console.error('Error comparing prices:', error);
      toast({
        title: "Errore",
        description: "Impossibile confrontare i prezzi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna indietro
          </Button>
          <h1 className="text-3xl font-bold mb-2">Confronta prezzi</h1>
          <p className="text-muted-foreground">Confronta i prezzi della tua spesa con un altro supermercato</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Seleziona supermercato da confrontare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Supermercato corrente: <strong>{currentStore}</strong>
              </p>
              <Select value={compareStore} onValueChange={setCompareStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un supermercato" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store} value={store}>
                      {store}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleCompare} disabled={loading || !compareStore} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confronto in corso...
                </>
              ) : (
                "Confronta prezzi"
              )}
            </Button>
          </CardContent>
        </Card>

        {comparison && (
          <Card>
            <CardHeader>
              <CardTitle>Risultato confronto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 ${comparison.current.total <= comparison.compare.total ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'}`}>
                  <h3 className="font-semibold mb-2">{comparison.current.store}</h3>
                  <p className="text-2xl font-bold">€{comparison.current.total.toFixed(2)}</p>
                  {comparison.current.total <= comparison.compare.total && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Più conveniente</p>
                  )}
                </div>
                
                <div className={`p-4 rounded-lg border-2 ${comparison.compare.total < comparison.current.total ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'}`}>
                  <h3 className="font-semibold mb-2">{comparison.compare.store}</h3>
                  <p className="text-2xl font-bold">€{comparison.compare.total.toFixed(2)}</p>
                  {comparison.compare.total < comparison.current.total && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Più conveniente</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Dettaglio prodotti</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">{comparison.current.store.split(' - ')[0]}</TableHead>
                      <TableHead className="text-right">{comparison.compare.store.split(' - ')[0]}</TableHead>
                      <TableHead className="text-right">Differenza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.current.items.map((item, index) => {
                      const compareItem = comparison.compare.items[index];
                      const currentItemTotal = item.price * item.quantity;
                      const compareItemTotal = compareItem.price * compareItem.quantity;
                      const diff = compareItemTotal - currentItemTotal;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {item.name}
                            <span className="text-xs text-muted-foreground ml-2">(x{item.quantity})</span>
                          </TableCell>
                          <TableCell className="text-right">€{currentItemTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">€{compareItemTotal.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-medium ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}>
                            {diff > 0 ? `+€${diff.toFixed(2)}` : diff < 0 ? `-€${Math.abs(diff).toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {comparison.current.total !== comparison.compare.total && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-center">
                    {comparison.current.total < comparison.compare.total ? (
                      <>
                        Risparmi <strong>€{(comparison.compare.total - comparison.current.total).toFixed(2)}</strong> scegliendo {comparison.current.store.split(' - ')[0]}
                      </>
                    ) : (
                      <>
                        Risparmi <strong>€{(comparison.current.total - comparison.compare.total).toFixed(2)}</strong> scegliendo {comparison.compare.store.split(' - ')[0]}
                      </>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default CompareStores;
