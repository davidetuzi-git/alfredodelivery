import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProductPriceSearchProps {
  storeName: string;
}

const ProductPriceSearch = ({ storeName }: ProductPriceSearchProps) => {
  const [product, setProduct] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [completedProduct, setCompletedProduct] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!product.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il nome di un prodotto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setCompletedProduct(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-product-price', {
        body: { 
          product: product.trim(),
          storeName 
        }
      });

      if (error) {
        if (error.message.includes('429')) {
          toast({
            title: "Troppe richieste",
            description: "Riprova tra qualche secondo",
            variant: "destructive",
          });
        } else if (error.message.includes('402')) {
          toast({
            title: "Crediti esauriti",
            description: "Contatta l'amministratore",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setResult(data.priceInfo);
      if (data.completedProduct) {
        setCompletedProduct(data.completedProduct);
      }
      if (data.completedProduct && data.completedProduct !== product.trim()) {
        setCompletedProduct(data.completedProduct);
      }
    } catch (error) {
      console.error('Error searching product price:', error);
      toast({
        title: "Errore",
        description: "Impossibile cercare il prezzo del prodotto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Cerca prezzo prodotto (es: latte intero 1L)"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button 
          onClick={handleSearch} 
          disabled={loading || !storeName}
          size="icon"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!storeName && (
        <p className="text-sm text-muted-foreground">
          Seleziona prima un supermercato dalla lista o dalla mappa
        </p>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-lg font-semibold">{result}</p>
            {completedProduct && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {completedProduct}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductPriceSearch;
