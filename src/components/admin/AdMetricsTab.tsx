import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointer, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";

interface AdMetric {
  adId: string;
  storeName: string;
  uniqueImpressions: number;
  totalClicks: number;
  ctr: number;
}

const adNames: Record<string, string> = {
  "esselunga-offerta-speciale": "Esselunga - Offerta Speciale",
  "conad-promo-weekend": "Conad - Promo Weekend",
  "carrefour-sottocosto": "Carrefour - Sottocosto",
  "lidl-settimana-italiana": "Lidl - Settimana Italiana",
  "eurospin-spesa-intelligente": "Eurospin - Spesa Intelligente",
  "coop-soci-in-festa": "Coop - Soci in Festa"
};

export const AdMetricsTab = () => {
  const [metrics, setMetrics] = useState<AdMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    impressions: 0,
    clicks: 0,
    avgCtr: 0
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Get all unique impressions grouped by ad_id
      const { data: impressions } = await supabase
        .from('ad_impressions')
        .select('ad_id');

      // Get all clicks grouped by ad_id
      const { data: clicks } = await supabase
        .from('ad_clicks')
        .select('ad_id');

      // Aggregate data
      const impressionCounts: Record<string, number> = {};
      const clickCounts: Record<string, number> = {};

      impressions?.forEach(imp => {
        impressionCounts[imp.ad_id] = (impressionCounts[imp.ad_id] || 0) + 1;
      });

      clicks?.forEach(click => {
        clickCounts[click.ad_id] = (clickCounts[click.ad_id] || 0) + 1;
      });

      // Build metrics array
      const allAdIds = new Set([
        ...Object.keys(impressionCounts),
        ...Object.keys(clickCounts),
        ...Object.keys(adNames)
      ]);

      const metricsData: AdMetric[] = Array.from(allAdIds).map(adId => {
        const uniqueImpressions = impressionCounts[adId] || 0;
        const totalClicks = clickCounts[adId] || 0;
        const ctr = uniqueImpressions > 0 ? (totalClicks / uniqueImpressions) * 100 : 0;

        return {
          adId,
          storeName: adNames[adId] || adId,
          uniqueImpressions,
          totalClicks,
          ctr
        };
      });

      // Sort by impressions descending
      metricsData.sort((a, b) => b.uniqueImpressions - a.uniqueImpressions);

      setMetrics(metricsData);

      // Calculate totals
      const totalImpressions = metricsData.reduce((sum, m) => sum + m.uniqueImpressions, 0);
      const totalClicksSum = metricsData.reduce((sum, m) => sum + m.totalClicks, 0);
      const avgCtr = totalImpressions > 0 ? (totalClicksSum / totalImpressions) * 100 : 0;

      setTotals({
        impressions: totalImpressions,
        clicks: totalClicksSum,
        avgCtr
      });
    } catch (error) {
      console.error('Error loading ad metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Impressioni Uniche</p>
                <p className="text-2xl font-bold">{totals.impressions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <MousePointer className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Totali</p>
                <p className="text-2xl font-bold">{totals.clicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CTR Medio</p>
                <p className="text-2xl font-bold">{totals.avgCtr.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Banner Pubblicitari</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessun dato disponibile. Le metriche appariranno quando gli utenti visualizzeranno i banner.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banner</TableHead>
                  <TableHead className="text-right">Impressioni Uniche</TableHead>
                  <TableHead className="text-right">Click</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.adId}>
                    <TableCell className="font-medium">{metric.storeName}</TableCell>
                    <TableCell className="text-right">{metric.uniqueImpressions}</TableCell>
                    <TableCell className="text-right">{metric.totalClicks}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={metric.ctr > 5 ? "default" : metric.ctr > 2 ? "secondary" : "outline"}
                      >
                        {metric.ctr.toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
