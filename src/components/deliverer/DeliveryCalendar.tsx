import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Clock, MapPin, Package } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  delivery_address: string;
  delivery_status: string;
  total_amount: number;
  created_at: string;
  store_name: string;
  delivery_date: string;
  time_slot: string;
  pickup_code: string;
}

interface DeliveryCalendarProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
}

export const DeliveryCalendar = ({ orders, onOrderClick }: DeliveryCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get orders for selected date
  const ordersForSelectedDate = orders.filter(order => 
    selectedDate && isSameDay(parseISO(order.delivery_date), selectedDate)
  );

  // Get dates with orders
  const datesWithOrders = orders.map(order => parseISO(order.delivery_date));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'assigned':
        return 'bg-blue-500';
      case 'at_store':
        return 'bg-purple-500';
      case 'shopping_complete':
        return 'bg-orange-500';
      case 'on_the_way':
        return 'bg-yellow-500';
      case 'delivered':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermato';
      case 'assigned':
        return 'Assegnato';
      case 'at_store':
        return 'Al Negozio';
      case 'shopping_complete':
        return 'Spesa Completata';
      case 'on_the_way':
        return 'In Consegna';
      case 'delivered':
        return 'Consegnato';
      case 'cancelled':
        return 'Annullato';
      default:
        return status;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Calendario Consegne</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={it}
            className="rounded-md border"
            modifiers={{
              booked: datesWithOrders,
            }}
            modifiersClassNames={{
              booked: "bg-primary/10 font-bold",
            }}
          />
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Le date evidenziate hanno consegne programmate</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersForSelectedDate.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>Nessuna consegna programmata per questa data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ordersForSelectedDate.map((order) => (
                <div
                  key={order.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => onOrderClick?.(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{order.time_slot}</span>
                    </div>
                    <Badge className={getStatusColor(order.delivery_status)}>
                      {getStatusLabel(order.delivery_status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span className="font-medium">{order.store_name}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{order.delivery_address}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Codice: </span>
                      <span className="font-mono font-semibold text-xs">{order.pickup_code}</span>
                    </div>
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
