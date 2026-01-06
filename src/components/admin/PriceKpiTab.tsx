import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface KPIData {
  total_searches: number;
  found_real: number;
  found_estimated: number;
  not_found: number;
  trovaprezzi_percentage: number;
  search_date: string;
}

interface TotalKPI {
  totalSearches: number;
  foundReal: number;
  foundEstimated: number;
  notFound: number;
  percentage: number;
}

export const PriceKpiTab = () => {
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [totalKpi, setTotalKpi] = useState<TotalKPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKpiData();
  }, []);

  const loadKpiData = async () => {
    setIsLoading(true);
    try {
      // Carica dati aggregati per giorno
      const { data: dailyData, error: dailyError } = await supabase
        .from('price_search_kpi')
        .select('*')
        .order('search_date', { ascending: false })
        .limit(30);

      if (dailyError) {
        console.error('Errore caricamento KPI giornalieri:', dailyError);
      } else {
        setKpiData(dailyData || []);
      }

      // Calcola totali
      const { data: totals, error: totalsError } = await supabase
        .from('price_search_logs')
        .select('price_found, is_estimated');

      if (!totalsError && totals) {
        const totalSearches = totals.length;
        const foundReal = totals.filter(t => t.price_found && !t.is_estimated).length;
        const foundEstimated = totals.filter(t => t.price_found && t.is_estimated).length;
        const notFound = totals.filter(t => !t.price_found).length;
        const percentage = totalSearches > 0 ? (foundReal / totalSearches) * 100 : 0;

        setTotalKpi({
          totalSearches,
          foundReal,
          foundEstimated,
          notFound,
          percentage
        });
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" />
            KPI TrovaPrezzi
          </h2>
          <p className="text-muted-foreground">
            Monitoraggio efficacia ricerca prezzi reali
          </p>
        </div>
        <Badge 
          variant={totalKpi && totalKpi.percentage >= 80 ? "default" : totalKpi && totalKpi.percentage >= 50 ? "secondary" : "destructive"}
          className="text-lg px-4 py-2"
        >
          {totalKpi ? `${totalKpi.percentage.toFixed(1)}%` : '-'}
        </Badge>
      </div>

      {/* Cards KPI principali */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              Ricerche Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalKpi?.totalSearches.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prodotti cercati
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Prezzi Reali Trovati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {totalKpi?.foundReal.toLocaleString() || 0}
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              Dalla catena selezionata
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Prezzi Stimati (+10%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
              {totalKpi?.foundEstimated.toLocaleString() || 0}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
              Da altre catene
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Non Trovati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              {totalKpi?.notFound.toLocaleString() || 0}
            </div>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              Nessun prezzo disponibile
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI principale grande */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Indice TrovaPrezzi
          </CardTitle>
          <CardDescription>
            Percentuale di prezzi REALI trovati (escluse stime)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-5xl font-bold text-primary">
                {totalKpi ? `${totalKpi.percentage.toFixed(1)}%` : '0%'}
              </div>
              <p className="text-muted-foreground mt-2">
                {totalKpi?.foundReal.toLocaleString() || 0} / {totalKpi?.totalSearches.toLocaleString() || 0} referenze
              </p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-sm">Reali: {totalKpi?.foundReal || 0}</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="text-sm">Stimati: {totalKpi?.foundEstimated || 0}</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-sm">Non trovati: {totalKpi?.notFound || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storico giornaliero */}
      <Card>
        <CardHeader>
          <CardTitle>Storico Giornaliero</CardTitle>
          <CardDescription>Ultimi 30 giorni</CardDescription>
        </CardHeader>
        <CardContent>
          {kpiData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nessun dato disponibile. I dati appariranno dopo le prime ricerche prezzi.
            </p>
          ) : (
            <div className="space-y-2">
              {kpiData.map((day, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="font-medium">
                    {format(new Date(day.search_date), "EEEE d MMMM", { locale: it })}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {day.total_searches} ricerche
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-sm">{day.found_real} reali</span>
                      <span className="text-orange-600 text-sm">{day.found_estimated} stimati</span>
                      <span className="text-red-600 text-sm">{day.not_found} mancanti</span>
                    </div>
                    <Badge 
                      variant={day.trovaprezzi_percentage >= 80 ? "default" : day.trovaprezzi_percentage >= 50 ? "secondary" : "destructive"}
                    >
                      {day.trovaprezzi_percentage?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
