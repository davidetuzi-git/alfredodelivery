import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Check, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AddressRequest {
  id: string;
  deliverer_id: string;
  requested_address: string;
  requested_latitude: number;
  requested_longitude: number;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  deliverers: {
    name: string;
    email: string;
    phone: string;
    base_address: string | null;
  };
}

interface AddressRequestsTabProps {
  onUpdate: () => void;
}

export const AddressRequestsTab = ({ onUpdate }: AddressRequestsTabProps) => {
  const [requests, setRequests] = useState<AddressRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("deliverer_address_requests")
      .select(`
        *,
        deliverers (
          name,
          email,
          phone,
          base_address
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Errore nel caricamento delle richieste");
      return;
    }

    setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("deliverer_address_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          notes: notes[requestId] || null,
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Richiesta approvata! Indirizzo aggiornato");
      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Errore nell'approvazione");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("deliverer_address_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          notes: notes[requestId] || null,
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Richiesta rifiutata");
      await loadRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Errore nel rifiuto");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "approved":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "In Attesa";
      case "approved":
        return "Approvata";
      case "rejected":
        return "Rifiutata";
      default:
        return status;
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  if (loading) {
    return <p>Caricamento...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Richieste in Attesa ({pendingRequests.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessuna richiesta in attesa
            </p>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{request.deliverers.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.deliverers.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.deliverers.phone}
                      </p>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusLabel(request.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {request.deliverers.base_address && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Indirizzo Attuale:
                        </p>
                        <p className="text-sm">{request.deliverers.base_address}</p>
                      </div>
                    )}
                    
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                        Nuovo Indirizzo Richiesto:
                      </p>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {request.requested_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Richiesta il{" "}
                    {format(new Date(request.created_at), "dd MMM yyyy 'alle' HH:mm", {
                      locale: it,
                    })}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`notes-${request.id}`}>Note (opzionale)</Label>
                    <Textarea
                      id={`notes-${request.id}`}
                      value={notes[request.id] || ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [request.id]: e.target.value })
                      }
                      placeholder="Aggiungi una nota per il fattorino..."
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approva
                    </Button>
                    <Button
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rifiuta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storico Richieste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {processedRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{request.deliverers.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.requested_address}
                    </p>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {getStatusLabel(request.status)}
                  </Badge>
                </div>
                {request.notes && (
                  <p className="text-sm text-muted-foreground">
                    Note: {request.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {request.reviewed_at &&
                    `Revisionata il ${format(
                      new Date(request.reviewed_at),
                      "dd MMM yyyy 'alle' HH:mm",
                      { locale: it }
                    )}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
