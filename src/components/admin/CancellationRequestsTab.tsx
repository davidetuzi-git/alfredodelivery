import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface CancellationRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  orders?: {
    pickup_code: string;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    store_name: string;
    delivery_date: string;
    time_slot: string;
    delivery_status: string;
    total_amount: number;
    deliverer_name: string | null;
  };
}

export const CancellationRequestsTab = () => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cancellation_requests")
        .select(`
          *,
          orders (
            pickup_code,
            customer_name,
            customer_phone,
            delivery_address,
            store_name,
            delivery_date,
            time_slot,
            delivery_status,
            total_amount,
            deliverer_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data as CancellationRequest[]);
    } catch (error) {
      console.error("Error loading cancellation requests:", error);
      toast.error("Errore nel caricamento delle richieste");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: CancellationRequest) => {
    setProcessing(request.id);
    try {
      // Update cancellation request status
      const { error: reqError } = await supabase
        .from("cancellation_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (reqError) throw reqError;

      // Cancel the order
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          delivery_status: "cancelled",
          status: "cancelled",
        })
        .eq("id", request.order_id);

      if (orderError) throw orderError;

      // Create notification for customer
      await supabase
        .from("user_notifications")
        .insert({
          user_id: request.user_id,
          type: "order_cancelled",
          title: "Ordine annullato",
          message: `La tua richiesta di annullamento per l'ordine ${request.orders?.pickup_code} è stata approvata.`,
          data: { order_id: request.order_id },
        });

      toast.success("Ordine annullato con successo");
      loadRequests();
    } catch (error) {
      console.error("Error approving cancellation:", error);
      toast.error("Errore nell'approvazione");
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(selectedRequest.id);
    try {
      // Update cancellation request status
      const { error: reqError } = await supabase
        .from("cancellation_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          admin_notes: rejectReason || null,
        })
        .eq("id", selectedRequest.id);

      if (reqError) throw reqError;

      // Create notification for customer
      await supabase
        .from("user_notifications")
        .insert({
          user_id: selectedRequest.user_id,
          type: "cancellation_rejected",
          title: "Richiesta annullamento rifiutata",
          message: `La tua richiesta di annullamento per l'ordine ${selectedRequest.orders?.pickup_code} è stata rifiutata.${rejectReason ? ` Motivo: ${rejectReason}` : ""}`,
          data: { order_id: selectedRequest.order_id },
        });

      toast.success("Richiesta rifiutata");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Error rejecting cancellation:", error);
      toast.error("Errore nel rifiuto");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">In attesa</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Approvata</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-700 border-red-500/20">Rifiutata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Richieste di Annullamento</h2>
          <p className="text-muted-foreground">
            Gestisci le richieste di annullamento ordini
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingCount} in attesa
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nessuna richiesta</h3>
            <p className="text-muted-foreground">
              Non ci sono richieste di annullamento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={request.status === "pending" ? "border-yellow-500/50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      Ordine {request.orders?.pickup_code}
                    </CardTitle>
                    {getStatusBadge(request.status)}
                    <Badge variant="outline">
                      {request.orders?.delivery_status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(request.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{request.orders?.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Negozio</p>
                    <p className="font-medium">{request.orders?.store_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Consegna</p>
                    <p className="font-medium">
                      {request.orders?.delivery_date && format(new Date(request.orders.delivery_date), "dd/MM/yyyy", { locale: it })} - {request.orders?.time_slot}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Totale</p>
                    <p className="font-medium">€{request.orders?.total_amount?.toFixed(2)}</p>
                  </div>
                </div>

                {request.orders?.deliverer_name && (
                  <div className="p-2 bg-primary/5 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Fattorino assegnato: </span>
                      <span className="font-medium">{request.orders.deliverer_name}</span>
                    </p>
                  </div>
                )}

                {request.reason && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Motivo richiesta:</p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                )}

                {request.admin_notes && request.status === "rejected" && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-sm font-medium mb-1 text-red-700">Motivo rifiuto:</p>
                    <p className="text-sm text-red-600">{request.admin_notes}</p>
                  </div>
                )}

                {request.status === "pending" && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(request)}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approva Annullamento
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => openRejectDialog(request)}
                      disabled={processing === request.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rifiuta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta richiesta di annullamento</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Stai per rifiutare la richiesta di annullamento per l'ordine{" "}
                <strong>{selectedRequest?.orders?.pickup_code}</strong>.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Motivo del rifiuto (opzionale):
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Spiega perché la richiesta è stata rifiutata..."
                  className="min-h-[80px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Rifiuta Richiesta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
