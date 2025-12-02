import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, MapPin, Clock, CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
  zone?: string;
  email?: string;
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

interface DeliverersTabProps {
  deliverers: Deliverer[];
}

export const DeliverersTab = ({ deliverers }: DeliverersTabProps) => {
  const [requests, setRequests] = useState<DelivererRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    console.log('Fetching deliverer requests...');
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

    console.log('Requests fetched:', data);
    setRequests(data || []);
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
      window.location.reload(); // Ricarica per aggiornare la lista deliverer
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

                const getDocumentUrl = async (path: string) => {
                  const { data } = await supabase.storage
                    .from('deliverer-documents')
                    .createSignedUrl(path, 3600); // 1 hour expiry
                  return data?.signedUrl;
                };

                const handleViewDocument = async (documentUrl: string | null) => {
                  if (!documentUrl) {
                    toast.error("Documento non disponibile");
                    return;
                  }
                  const url = await getDocumentUrl(documentUrl);
                  if (url) {
                    window.open(url, '_blank');
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
                          
                          {/* Document Section */}
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
