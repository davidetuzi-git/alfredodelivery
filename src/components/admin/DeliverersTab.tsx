import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin } from "lucide-react";

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
  zone?: string;
}

interface DeliverersTabProps {
  deliverers: Deliverer[];
}

export const DeliverersTab = ({ deliverers }: DeliverersTabProps) => {
  const getStatusColor = (status: string) => {
    return status === "available" 
      ? "bg-green-500/10 text-green-700 border-green-500/20"
      : "bg-orange-500/10 text-orange-700 border-orange-500/20";
  };

  const getStatusLabel = (status: string) => {
    return status === "available" ? "Disponibile" : "Occupato";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Fattorini Attivi ({deliverers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deliverers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 col-span-full">
                Nessun fattorino disponibile
              </p>
            ) : (
              deliverers.map((deliverer) => (
                <Card key={deliverer.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{deliverer.name}</p>
                          <Badge className={getStatusColor(deliverer.status)} variant="outline">
                            {getStatusLabel(deliverer.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{deliverer.phone}</span>
                      </div>
                      
                      {deliverer.zone && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{deliverer.zone}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Ordini attivi:</span>
                          <span className="font-semibold">
                            {deliverer.current_orders} / {deliverer.max_orders}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(deliverer.current_orders / deliverer.max_orders) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* TODO: Mappa dei fattorini - da implementare con Mapbox */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mappa Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Mappa in arrivo...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
