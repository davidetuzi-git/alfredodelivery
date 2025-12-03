import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Phone, MapPin, Clock, CheckCircle, XCircle, FileText, ExternalLink, Ban, Trash2, Eye, Star, Package, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useImpersonation } from "@/hooks/useImpersonation";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Deliverer {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email?: string;
  status: string;
  current_orders: number;
  max_orders: number;
  zone?: string;
  rating?: number;
  total_deliveries?: number;
  base_address?: string;
  created_at?: string;
}

interface DelivererRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  document_url: string | null;
  document_type: string | null;
}

interface DelivererDetails {
  deliverer: Deliverer;
  recentOrders: Array<{
    id: string;
    delivery_date: string;
    total_amount: number;
    delivery_status: string;
    store_name: string;
    customer_name: string;
  }>;
  earnings: {
    total: number;
    tips: number;
  };
}

interface DeliverersTabProps {
  deliverers: Deliverer[];
}

export const DeliverersTab = ({ deliverers: initialDeliverers }: DeliverersTabProps) => {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [deliverers, setDeliverers] = useState<Deliverer[]>(initialDeliverers);
  const [requests, setRequests] = useState<DelivererRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeliverer, setSelectedDeliverer] = useState<DelivererDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [actionDelivererId, setActionDelivererId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    fetchDeliverers();
  }, []);

  const fetchDeliverers = async () => {
    const { data, error } = await supabase
      .from('deliverers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDeliverers(data);
    }
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('deliverer_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast.error(`Errore nel caricamento richieste: ${error.message}`);
      return;
    }

    setRequests(data || []);
  };

  const loadDelivererDetails = async (delivererId: string) => {
    try {
      const deliverer = deliverers.find(d => d.id === delivererId);
      if (!deliverer) return;

      // Get recent orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, delivery_date, total_amount, delivery_status, store_name, customer_name")
        .eq("deliverer_id", delivererId)
        .order("delivery_date", { ascending: false })
        .limit(10);

      // Get earnings
      const { data: earnings } = await supabase
        .from("rider_earnings")
        .select("total_earnings, tip_amount")
        .eq("deliverer_id", delivererId);

      const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.total_earnings), 0) || 0;
      const totalTips = earnings?.reduce((sum, e) => sum + Number(e.tip_amount), 0) || 0;

      setSelectedDeliverer({
        deliverer,
        recentOrders: orders || [],
        earnings: {
          total: totalEarnings,
          tips: totalTips,
        },
      });
      setDialogOpen(true);
    } catch (error) {
      console.error("Error loading deliverer details:", error);
    }
  };

  const handleApprove = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('approve_deliverer_request', {
        request_id: requestId,
      });

      if (error) throw error;

      toast.success("Fattorino approvato con successo!");
      await fetchRequests();
      await fetchDeliverers();
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'approvazione");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('deliverer_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Richiesta rifiutata");
      await fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Errore durante il rifiuto");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockDeliverer = async () => {
    if (!actionDelivererId) return;
    try {
      const { error } = await supabase
        .from("deliverers")
        .update({ status: "blocked" })
        .eq("id", actionDelivererId);

      if (error) throw error;

      toast.success("Fattorino bloccato con successo");
      setBlockDialogOpen(false);
      setActionDelivererId(null);
      await fetchDeliverers();
      if (selectedDeliverer?.deliverer.id === actionDelivererId) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error blocking deliverer:", error);
      toast.error("Errore nel blocco del fattorino");
    }
  };

  const handleDeleteDeliverer = async () => {
    if (!actionDelivererId) return;
    try {
      const { error } = await supabase
        .from("deliverers")
        .delete()
        .eq("id", actionDelivererId);

      if (error) throw error;

      toast.success("Fattorino eliminato con successo");
      setDeleteDialogOpen(false);
      setActionDelivererId(null);
      await fetchDeliverers();
      if (selectedDeliverer?.deliverer.id === actionDelivererId) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting deliverer:", error);
      toast.error("Errore nell'eliminazione del fattorino");
    }
  };

  const handleViewAsDeliverer = () => {
    if (selectedDeliverer?.deliverer.user_id) {
      startImpersonation(selectedDeliverer.deliverer.user_id, selectedDeliverer.deliverer.name);
      setDialogOpen(false);
      navigate("/deliverer/dashboard");
    } else {
      toast.error("Questo fattorino non ha un account utente collegato");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "busy":
        return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      case "blocked":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "inactive":
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Disponibile";
      case "busy": return "Occupato";
      case "blocked": return "Bloccato";
      case "inactive": return "Non attivo";
      default: return status;
    }
  };

  const getOrderStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'confirmed': 'Confermato',
      'assigned': 'Assegnato',
      'at_store': 'Al supermercato',
      'shopping_complete': 'Spesa completata',
      'on_the_way': 'In consegna',
      'delivered': 'Consegnato',
      'cancelled': 'Cancellato'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Richieste Pending */}
      {requests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Clock className="h-5 w-5" />
              Richieste di Registrazione Pending ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.map((request) => {
                const getDocumentLabel = (type: string | null) => {
                  switch (type) {
                    case 'carta_identita': return "Carta d'Identità";
                    case 'patente': return 'Patente';
                    case 'passaporto': return 'Passaporto';
                    default: return 'Non specificato';
                  }
                };

                const handleViewDocument = async (documentUrl: string | null) => {
                  if (!documentUrl) {
                    toast.error("Documento non disponibile");
                    return;
                  }
                  const { data } = await supabase.storage
                    .from('deliverer-documents')
                    .createSignedUrl(documentUrl, 3600);
                  if (data?.signedUrl) {
                    window.open(data.signedUrl, '_blank');
                  } else {
                    toast.error("Errore nel caricamento del documento");
                  }
                };

                return (
                  <Card key={request.id} className="bg-background">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{request.name}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="text-muted-foreground">Email: {request.email}</p>
                            <p className="text-muted-foreground">Telefono: {request.phone}</p>
                            <p className="text-xs text-muted-foreground">
                              Richiesta: {new Date(request.created_at).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          
                          <div className="pt-2 mt-2 border-t">
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="font-medium">Documento:</span>
                              <span>{getDocumentLabel(request.document_type)}</span>
                              {request.document_url ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleViewDocument(request.document_url)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Visualizza
                                </Button>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  Non caricato
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(request.id)}
                            disabled={loading || !request.document_url}
                            className="gap-2"
                            title={!request.document_url ? "Documento richiesto" : ""}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approva
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                            disabled={loading}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Rifiuta
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Fattorini ({deliverers.length})
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
                <Card 
                  key={deliverer.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => loadDelivererDetails(deliverer.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p 
                            className="font-semibold text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deliverer.user_id) {
                                startImpersonation(deliverer.user_id, deliverer.name);
                                navigate("/deliverer/dashboard");
                              } else {
                                toast.error("Nessun account utente collegato");
                              }
                            }}
                          >
                            {deliverer.name}
                          </p>
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

                      {deliverer.rating !== undefined && deliverer.rating > 0 && (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span>{deliverer.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">
                            ({deliverer.total_deliveries || 0} consegne)
                          </span>
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

      {/* Deliverer Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dettagli Fattorino
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleViewAsDeliverer}
                  disabled={!selectedDeliverer?.deliverer.user_id}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Visualizza come fattorino
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setActionDelivererId(selectedDeliverer?.deliverer.id || null);
                    setBlockDialogOpen(true);
                  }}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Blocca
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setActionDelivererId(selectedDeliverer?.deliverer.id || null);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Elimina
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedDeliverer && (
            <div className="space-y-6">
              {/* Info base */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informazioni Personali
                    </h4>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Nome:</span>{" "}
                        {selectedDeliverer.deliverer.name}
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {selectedDeliverer.deliverer.phone}
                      </p>
                      {selectedDeliverer.deliverer.email && (
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {selectedDeliverer.deliverer.email}
                        </p>
                      )}
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {selectedDeliverer.deliverer.base_address || selectedDeliverer.deliverer.zone || "N/D"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Statistiche
                    </h4>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Rating:</span>{" "}
                        {selectedDeliverer.deliverer.rating?.toFixed(1) || "N/D"} ⭐
                      </p>
                      <p>
                        <span className="text-muted-foreground">Consegne totali:</span>{" "}
                        {selectedDeliverer.deliverer.total_deliveries || 0}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Guadagni totali:</span>{" "}
                        €{selectedDeliverer.earnings.total.toFixed(2)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Mance totali:</span>{" "}
                        €{selectedDeliverer.earnings.tips.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4" />
                    Ordini Recenti
                  </h4>
                  {selectedDeliverer.recentOrders.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDeliverer.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded"
                        >
                          <div>
                            <p className="font-medium text-sm">{order.store_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.delivery_date), "d MMM yyyy", { locale: it })} • {order.customer_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">€{order.total_amount.toFixed(2)}</p>
                            <Badge variant="secondary" className="text-xs">
                              {getOrderStatusLabel(order.delivery_status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun ordine recente</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloccare questo fattorino?</AlertDialogTitle>
            <AlertDialogDescription>
              Il fattorino non potrà più ricevere nuovi ordini o accedere alla piattaforma.
              Puoi sbloccare il fattorino in qualsiasi momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockDeliverer} className="bg-destructive text-destructive-foreground">
              Blocca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo fattorino?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Tutti i dati del fattorino verranno eliminati permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeliverer} className="bg-destructive text-destructive-foreground">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Map placeholder */}
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
