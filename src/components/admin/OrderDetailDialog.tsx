import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, MapPin, Clock, User, Phone, Calendar, ShoppingBag, Truck, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OrderDetailDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdate?: () => void;
}

export const OrderDetailDialog = ({ order, open, onOpenChange, onOrderUpdate }: OrderDetailDialogProps) => {
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [isRefunding, setIsRefunding] = useState(false);

  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500';
      case 'assigned': return 'bg-purple-500';
      case 'in_transit': return 'bg-yellow-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confermato';
      case 'assigned': return 'Assegnato';
      case 'in_transit': return 'In Transito';
      case 'delivered': return 'Consegnato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  const handleRefund = async (isFullRefund: boolean) => {
    setIsRefunding(true);
    try {
      const amount = isFullRefund ? null : parseFloat(refundAmount);
      
      if (!isFullRefund && (!amount || amount <= 0 || amount > order.total_amount)) {
        toast({
          title: "Errore",
          description: "Importo non valido",
          variant: "destructive"
        });
        setIsRefunding(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('refund-stripe-payment', {
        body: {
          orderId: order.id,
          amount: isFullRefund ? null : amount,
          reason: refundReason
        }
      });

      if (error) throw error;

      toast({
        title: "Rimborso effettuato",
        description: `Rimborso di €${data.amount.toFixed(2)} completato con successo`,
      });

      setShowRefundForm(false);
      setRefundAmount('');
      onOrderUpdate?.();

    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "Errore rimborso",
        description: error.message || "Impossibile elaborare il rimborso",
        variant: "destructive"
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const canRefund = order.payment_method === 'card' && order.delivery_status !== 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Dettagli Ordine</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Codice Ritiro - Destacato */}
          <Card className="border-2 border-primary">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Codice di Ritiro</p>
                <p className="text-4xl font-bold tracking-wider text-primary">
                  {order.pickup_code}
                </p>
                <p className="text-sm text-muted-foreground">
                  Mostra questo codice al fattorino per il ritiro
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stato dell'ordine */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Stato Ordine</h3>
                <Badge className={getStatusColor(order.delivery_status)}>
                  {getStatusLabel(order.delivery_status)}
                </Badge>
              </div>
              <OrderStatusTracker currentStatus={order.delivery_status} />
            </CardContent>
          </Card>

          {/* Refund Section - Only for card payments */}
          {canRefund && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Rimborso
                  </h3>
                  {!showRefundForm && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowRefundForm(true)}
                    >
                      Gestisci Rimborso
                    </Button>
                  )}
                </div>

                {showRefundForm && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Importo rimborso parziale (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={order.total_amount}
                          placeholder={`Max €${order.total_amount.toFixed(2)}`}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Motivo</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                        >
                          <option value="requested_by_customer">Richiesto dal cliente</option>
                          <option value="duplicate">Pagamento duplicato</option>
                          <option value="fraudulent">Fraudolento</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRefund(false)}
                        disabled={isRefunding || !refundAmount}
                      >
                        {isRefunding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Rimborso Parziale
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleRefund(true)}
                        disabled={isRefunding}
                      >
                        {isRefunding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Rimborso Totale (€{order.total_amount.toFixed(2)})
                      </Button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowRefundForm(false)}
                    >
                      Annulla
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informazioni Cliente */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">Informazioni Cliente</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium">{order.customer_phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Indirizzo di Consegna</p>
                    <p className="font-medium">{order.delivery_address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dettagli Consegna */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">Dettagli Consegna</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Supermercato</p>
                    <p className="font-medium">{order.store_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data Consegna</p>
                    <p className="font-medium">
                      {format(new Date(order.delivery_date), "dd MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fascia Oraria</p>
                    <p className="font-medium">{order.time_slot}</p>
                  </div>
                </div>
                {order.deliverer_name && (
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fattorino</p>
                      <p className="font-medium">{order.deliverer_name}</p>
                      {order.deliverer_phone && (
                        <p className="text-sm text-muted-foreground">{order.deliverer_phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prodotti */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Prodotti Ordinati</h3>
              <div className="space-y-3">
                {order.items && Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.supermarket} • Quantità: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotale</span>
                  <span>€{(order.total_amount - order.delivery_fee + order.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spese di consegna</span>
                  <span>€{order.delivery_fee.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Sconto</span>
                    <span>-€{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Totale</span>
                  <span>€{order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metodo di Pagamento */}
          {order.payment_method && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Metodo di Pagamento</h3>
                <p className="text-muted-foreground capitalize">
                  {order.payment_method === 'cash' ? 'Contanti alla consegna' : 
                   order.payment_method === 'card' ? 'Carta di credito' :
                   order.payment_method}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
