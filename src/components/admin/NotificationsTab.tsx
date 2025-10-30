import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DeliveryNotification {
  id: string;
  order_id: string;
  status: string;
  sent_at: string;
  responded_at: string | null;
  deliverers: {
    name: string;
    phone: string;
  };
  orders: {
    customer_name: string;
    delivery_address: string;
    pickup_code: string;
  };
}

interface NotificationsTabProps {
  orders: any[];
}

export const NotificationsTab = ({ orders }: NotificationsTabProps) => {
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [orders]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_notifications')
        .select(`
          *,
          deliverers (name, phone),
          orders (customer_name, delivery_address, pickup_code)
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">In attesa</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Accettato</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">Rifiutato</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento notifiche...</div>;
  }

  // Group notifications by order
  const notificationsByOrder = notifications.reduce((acc, notif) => {
    if (!acc[notif.order_id]) {
      acc[notif.order_id] = [];
    }
    acc[notif.order_id].push(notif);
    return acc;
  }, {} as Record<string, DeliveryNotification[]>);

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {Object.entries(notificationsByOrder).map(([orderId, orderNotifications]) => {
          const firstNotif = orderNotifications[0];
          const acceptedCount = orderNotifications.filter(n => n.status === 'accepted').length;
          const rejectedCount = orderNotifications.filter(n => n.status === 'rejected').length;
          const pendingCount = orderNotifications.filter(n => n.status === 'sent').length;

          return (
            <Card key={orderId}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      Ordine: {firstNotif.orders?.customer_name}
                    </div>
                    <div className="text-sm text-muted-foreground font-normal">
                      {firstNotif.orders?.delivery_address} • Codice: {firstNotif.orders?.pickup_code}
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    {acceptedCount > 0 && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        {acceptedCount} accettato
                      </Badge>
                    )}
                    {rejectedCount > 0 && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600">
                        {rejectedCount} rifiutato
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                        {pendingCount} in attesa
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {orderNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{notification.deliverers?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {notification.deliverers?.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          Inviato: {format(new Date(notification.sent_at), "dd MMM HH:mm", { locale: it })}
                          {notification.responded_at && (
                            <>
                              <br />
                              Risposto: {format(new Date(notification.responded_at), "dd MMM HH:mm", { locale: it })}
                            </>
                          )}
                        </div>
                        {getStatusBadge(notification.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nessuna notifica inviata ai fattorini
        </div>
      )}
    </div>
  );
};
