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

interface ComparisonItem {
  name: string;
  price: number;
  quantity: number;
  isEstimated?: boolean;
  notFound?: boolean;
}

const CompareStores = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = (location.state?.items || []) as ShoppingItem[];
  const currentStore = location.state?.currentStore || "";
  const nearbyStores = (location.state?.nearbyStores || []) as string[];
  
  const [compareStore, setCompareStore] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [comparison, setComparison] = useState<{
    current: { store: string; total: number; items: ComparisonItem[] };
    compare: { store: string; total: number; items: ComparisonItem[]; estimatedCount: number; notFoundCount: number };
  } | null>(null);

  // Use nearby stores from the map (within 10km) - filter out current store
  const stores = nearbyStores.filter(s => s !== currentStore);

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
    setComparison(null);
    setLoadingProgress({ current: 0, total: validItems.length });
    
    try {
      // Current store items - prices already known
      const currentItems: ComparisonItem[] = validItems.map(item => ({
        name: item.name,
        price: item.price!,
        quantity: item.quantity,
        isEstimated: false,
        notFound: false
      }));
      
      // Compare store items - need to fetch ALL prices fresh
      const compareItems: ComparisonItem[] = [];
      let estimatedCount = 0;
      let notFoundCount = 0;
      
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        setLoadingProgress({ current: i + 1, total: validItems.length });
        
        console.log(`[Confronto] Ricerca prezzo ${i + 1}/${validItems.length}: "${item.name}" presso ${compareStore}`);
        
        const { data, error } = await supabase.functions.invoke('search-product-price', {
          body: { 
            product: item.name.trim(),
            storeName: compareStore 
          }
        });

        console.log(`[Confronto] Risposta per "${item.name}":`, { 
          price: data?.price, 
          isEstimated: data?.isEstimated,
          source: data?.priceSource,
          error 
        });

        if (!error && data?.price !== undefined && data?.price !== null) {
          const isEstimated = data?.isEstimated === true || 
                              data?.priceSource === 'category_estimate' || 
                              data?.priceSource === 'ai_search';
          
          if (isEstimated) estimatedCount++;
          
          compareItems.push({
            name: item.name,
            price: data.price,
            quantity: item.quantity,
            isEstimated,
            notFound: false
          });
        } else {
          // Price NOT found - mark as not found, don't use original price!
          notFoundCount++;
          compareItems.push({
            name: item.name,
            price: 0, // Use 0 to indicate not found
            quantity: item.quantity,
            isEstimated: false,
            notFound: true
          });
        }
      }

      // Calculate totals (excluding not found items from compare total)
      const currentTotal = currentItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const compareTotal = compareItems
        .filter(item => !item.notFound)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      setComparison({
        current: {
          store: currentStore,
          total: currentTotal,
          items: currentItems
        },
        compare: {
          store: compareStore,
          total: compareTotal,
          items: compareItems,
          estimatedCount,
          notFoundCount
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
            
            {loading && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                  ⏳ <strong>Confronto in corso...</strong>
                </p>
                {loadingProgress.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-amber-600 dark:text-amber-300">
                      <span>Prodotto {loadingProgress.current} di {loadingProgress.total}</span>
                      <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-300 text-center">
                  A seconda del numero di prodotti, il confronto può richiedere da alcuni secondi ad alcuni minuti.
                </p>
              </div>
            )}
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
                  {(comparison.compare.estimatedCount > 0 || comparison.compare.notFoundCount > 0) && (
                    <div className="mt-2 text-xs space-y-1">
                      {comparison.compare.estimatedCount > 0 && (
                        <p className="text-amber-600 dark:text-amber-400">
                          ⚠️ {comparison.compare.estimatedCount} prezzi stimati
                        </p>
                      )}
                      {comparison.compare.notFoundCount > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          ❌ {comparison.compare.notFoundCount} prezzi non trovati
                        </p>
                      )}
                    </div>
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
                        <TableRow key={index} className={compareItem.notFound ? 'bg-red-50 dark:bg-red-950/20' : compareItem.isEstimated ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                          <TableCell>
                            {item.name}
                            <span className="text-xs text-muted-foreground ml-2">(x{item.quantity})</span>
                            {compareItem.notFound && (
                              <span className="text-xs text-red-500 ml-2">❌ Non trovato</span>
                            )}
                            {compareItem.isEstimated && !compareItem.notFound && (
                              <span className="text-xs text-amber-500 ml-2">⚠️ Stimato</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">€{currentItemTotal.toFixed(2)}</TableCell>
                          <TableCell className={`text-right ${compareItem.notFound ? 'text-red-500' : compareItem.isEstimated ? 'text-amber-600' : ''}`}>
                            {compareItem.notFound ? 'N/D' : `€${compareItemTotal.toFixed(2)}`}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${compareItem.notFound ? 'text-muted-foreground' : diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}>
                            {compareItem.notFound ? '-' : diff > 0 ? `+€${diff.toFixed(2)}` : diff < 0 ? `-€${Math.abs(diff).toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* Legend */}
                {(comparison.compare.estimatedCount > 0 || comparison.compare.notFoundCount > 0) && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                    <p className="font-medium text-muted-foreground">Legenda:</p>
                    <div className="flex flex-wrap gap-4">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-amber-100 dark:bg-amber-900 rounded"></span>
                        <span className="text-amber-600">⚠️ Stimato</span> = prezzo non verificato, basato su stime AI
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-red-100 dark:bg-red-900 rounded"></span>
                        <span className="text-red-500">❌ Non trovato</span> = prezzo non disponibile
                      </span>
                    </div>
                  </div>
                )}
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
