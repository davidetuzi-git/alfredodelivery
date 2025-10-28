import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";

interface Order {
  id: string;
  total_amount: number;
  delivery_date: string;
  delivery_status: string;
  deliverer_id: string | null;
}

interface FinanceTabProps {
  orders: Order[];
}

export const FinanceTab = ({ orders }: FinanceTabProps) => {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const filterOrdersByDate = () => {
    return orders.filter(order => {
      const orderDate = new Date(order.delivery_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return orderDate >= start && orderDate <= end;
    });
  };

  const filteredOrders = filterOrdersByDate();

  // Calcoli finanziari
  const totalSpesa = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  
  // Assumiamo una commissione del 15% sul totale
  const commissionRate = 0.15;
  const incassoServizio = totalSpesa * commissionRate;
  
  // Assumiamo un costo fisso di €5 per deliverer per ordine consegnato
  const costPerDelivery = 5;
  const deliveredOrders = filteredOrders.filter(o => o.delivery_status === "delivered" && o.deliverer_id);
  const costiDeliverers = deliveredOrders.length * costPerDelivery;
  
  const profittoNetto = incassoServizio - costiDeliverers;

  const setQuickDateRange = (months: number) => {
    const end = endOfMonth(today);
    const start = startOfMonth(subMonths(today, months - 1));
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Periodo Analisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inizio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Fine</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => setQuickDateRange(1)}>
                Questo Mese
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => setQuickDateRange(3)}>
                Ultimi 3 Mesi
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Analisi di {filteredOrders.length} ordini dal {format(new Date(startDate), "dd MMM yyyy", { locale: it })} al {format(new Date(endDate), "dd MMM yyyy", { locale: it })}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valore Spesa Totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalSpesa.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Da {filteredOrders.length} ordini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incasso Servizio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{incassoServizio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Commissione {(commissionRate * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costi Deliverers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">€{costiDeliverers.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {deliveredOrders.length} consegne × €{costPerDelivery}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitto Netto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profittoNetto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{profittoNetto.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Incasso - Costi
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Ordini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium border-b pb-2">
              <div>Stato</div>
              <div className="text-right">Ordini</div>
              <div className="text-right">Valore</div>
            </div>
            
            {["delivered", "in_transit", "confirmed"].map(status => {
              const statusOrders = filteredOrders.filter(o => o.delivery_status === status);
              const statusValue = statusOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
              const statusLabels: Record<string, string> = {
                delivered: "Consegnati",
                in_transit: "In Consegna",
                confirmed: "Programmati"
              };
              
              return (
                <div key={status} className="grid grid-cols-3 gap-4 text-sm py-2 border-b">
                  <div>{statusLabels[status]}</div>
                  <div className="text-right">{statusOrders.length}</div>
                  <div className="text-right font-medium">€{statusValue.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
