import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PriceComparisonProps {
  items: Array<{ name: string; price: number | null }>;
}

const PriceComparison = ({ items }: PriceComparisonProps) => {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<Record<string, number>>({});

  const stores = [
    "Esselunga - Via Roma 123",
    "Carrefour - Piazza Duomo 45",
    "Coop - Corso Italia 67",
    "Conad - Via Milano 89",
    "Pam - Viale Europa 12"
  ];

  const handleCompare = async () => {
    const validItems = items.filter(item => item.name.trim() !== "");
    
    if (validItems.length === 0) {
      toast({
        title: "Nessun prodotto",
        description: "Aggiungi almeno un prodotto per confrontare i prezzi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const newComparison: Record<string, number> = {};

    try {
      for (const store of stores) {
        let storeTotal = 0;
        
        for (const item of validItems) {
          const { data, error } = await supabase.functions.invoke('search-product-price', {
            body: { 
              product: item.name.trim(),
              storeName: store 
            }
          });

          if (!error && data?.price) {
            storeTotal += data.price;
          }
        }
        
        newComparison[store] = storeTotal;
      }

      setComparison(newComparison);
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

  const sortedStores = Object.entries(comparison).sort(([, a], [, b]) => a - b);
  const cheapest = sortedStores[0]?.[0];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" onClick={handleCompare} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Scale className="h-4 w-4 mr-2" />
          )}
          Confronta prezzi tra supermercati
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confronto prezzi</DialogTitle>
        </DialogHeader>
        
        {Object.keys(comparison).length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supermercato</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="text-right">Risparmio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStores.map(([store, total]) => (
                  <TableRow key={store} className={store === cheapest ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      {store}
                      {store === cheapest && (
                        <span className="ml-2 text-xs text-primary font-semibold">PIÙ CONVENIENTE</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">€{total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {store === cheapest 
                        ? "-" 
                        : `+€${(total - comparison[cheapest]).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Clicca il pulsante per confrontare i prezzi
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PriceComparison;
