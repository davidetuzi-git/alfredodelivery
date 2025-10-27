import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Package, CheckCircle, Clock, MapPin, Phone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrderTracking = () => {
  const navigate = useNavigate();

  const currentOrder = {
    id: "#ORD-2025-001",
    store: "Esselunga - Via Roma 123",
    shopper: "Marco Rossi",
    status: "in_corso",
    estimatedTime: "30 minuti",
    items: 12,
    total: "€44.80",
    steps: [
      { label: "Ordine ricevuto", time: "14:30", completed: true },
      { label: "Shopper assegnato", time: "14:32", completed: true },
      { label: "Acquisto in corso", time: "14:45", completed: true, active: true },
      { label: "In consegna", time: "15:15", completed: false },
      { label: "Consegnato", time: "15:45", completed: false },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Tracking ordine</h1>
          <p className="text-muted-foreground">Segui in tempo reale il tuo ordine</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{currentOrder.id}</CardTitle>
              <Badge className="bg-yellow-500">In corso</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{currentOrder.store}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Tempo stimato</div>
                  <div className="text-sm text-muted-foreground">Arrivo previsto</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-primary">{currentOrder.estimatedTime}</div>
            </div>

            <div className="space-y-1">
              {currentOrder.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 py-2">
                  <div className="relative">
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    {index < currentOrder.steps.length - 1 && (
                      <div
                        className={`absolute left-2.5 top-6 w-0.5 h-8 ${
                          step.completed ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className={`font-medium ${step.active ? "text-primary" : ""}`}>
                      {step.label}
                    </div>
                    <div className="text-sm text-muted-foreground">{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Il tuo shopper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">MR</span>
                </div>
                <div>
                  <div className="font-semibold">{currentOrder.shopper}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Sta facendo la spesa per te
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => navigate("/chat")}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riepilogo ordine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{currentOrder.items} articoli</span>
              <span className="font-semibold">{currentOrder.total}</span>
            </div>
            <Button variant="outline" className="w-full">Vedi dettagli completi</Button>
          </CardContent>
        </Card>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Riceverai notifiche in tempo reale
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                Ti aggiorneremo via push, SMS e WhatsApp ad ogni cambio di stato
              </div>
            </div>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default OrderTracking;
