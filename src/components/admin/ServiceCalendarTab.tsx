import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarOff, Mail, Send, AlertTriangle, PartyPopper, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEntry {
  id: string;
  date: string;
  is_blocked: boolean;
  is_holiday: boolean;
  holiday_name: string | null;
  reason: string | null;
  notification_sent_at: string | null;
}

export function ServiceCalendarTab() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendToUsers, setSendToUsers] = useState(true);
  const [sendToDeliverers, setSendToDeliverers] = useState(false);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('service_calendar')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      setEntries(data as CalendarEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const blockedDates = entries.filter(e => e.is_blocked).map(e => new Date(e.date));
  const holidayDates = entries.filter(e => e.is_holiday && !e.is_blocked).map(e => new Date(e.date));

  const handleSaveBlockedDates = async () => {
    if (selectedDates.length === 0) {
      toast({ title: "Seleziona almeno una data", variant: "destructive" });
      return;
    }

    setSaving(true);
    
    for (const date of selectedDates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = entries.find(e => e.date === dateStr);

      if (existing) {
        await supabase
          .from('service_calendar')
          .update({ is_blocked: true, reason })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('service_calendar')
          .insert({ date: dateStr, is_blocked: true, reason });
      }
    }

    toast({ title: "Date bloccate salvate con successo" });
    setSelectedDates([]);
    setReason("");
    fetchEntries();
    setSaving(false);
  };

  const handleRemoveBlockedDate = async (dateStr: string) => {
    const entry = entries.find(e => e.date === dateStr);
    if (!entry) return;

    if (entry.is_holiday) {
      await supabase
        .from('service_calendar')
        .update({ is_blocked: false, reason: null })
        .eq('id', entry.id);
    } else {
      await supabase
        .from('service_calendar')
        .delete()
        .eq('id', entry.id);
    }

    toast({ title: "Data sbloccata" });
    fetchEntries();
  };

  const handleSendNotification = async () => {
    if (!sendToUsers && !sendToDeliverers) {
      toast({ title: "Seleziona almeno un destinatario", variant: "destructive" });
      return;
    }

    const unnotifiedDates = entries.filter(e => e.is_blocked && !e.notification_sent_at);
    if (unnotifiedDates.length === 0) {
      toast({ title: "Nessuna data bloccata da notificare", variant: "destructive" });
      return;
    }

    setSendingEmail(true);

    try {
      const { error } = await supabase.functions.invoke('notify-service-closure', {
        body: {
          dates: unnotifiedDates.map(d => ({ date: d.date, reason: d.reason })),
          sendToUsers,
          sendToDeliverers
        }
      });

      if (error) throw error;

      // Mark as notified
      await supabase
        .from('service_calendar')
        .update({ notification_sent_at: new Date().toISOString() })
        .in('id', unnotifiedDates.map(d => d.id));

      toast({ title: "Notifiche inviate con successo" });
      fetchEntries();
    } catch (error: any) {
      toast({ title: "Errore nell'invio", description: error.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const upcomingBlockedDates = entries
    .filter(e => e.is_blocked && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const unnotifiedCount = entries.filter(e => e.is_blocked && !e.notification_sent_at).length;

  const modifiers = {
    blocked: blockedDates,
    holiday: holidayDates,
    selected: selectedDates
  };

  const modifiersClassNames = {
    blocked: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    holiday: "bg-amber-500 text-white hover:bg-amber-600",
    selected: "ring-2 ring-primary ring-offset-2"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Gestione Calendario Servizio
            </CardTitle>
            <CardDescription>
              Seleziona le date in cui il servizio non sarà disponibile. Le date devono essere comunicate con almeno 1 settimana di preavviso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                locale={it}
                disabled={(date) => date < addDays(new Date(), 7)}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border"
              />
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive" />
                <span>Non disponibile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span>Festività (+€10)</span>
              </div>
            </div>

            <Textarea
              placeholder="Motivo della chiusura (opzionale)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <Button 
              onClick={handleSaveBlockedDates} 
              disabled={selectedDates.length === 0 || saving}
              className="w-full"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarOff className="h-4 w-4 mr-2" />}
              Blocca Date Selezionate ({selectedDates.length})
            </Button>
          </CardContent>
        </Card>

        {/* Notification & List */}
        <div className="space-y-6">
          {/* Send Notification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invia Comunicazione
              </CardTitle>
              <CardDescription>
                Invia email di notifica per le date bloccate non ancora comunicate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {unnotifiedCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="text-sm">
                    {unnotifiedCount} date da notificare
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sendToUsers" 
                    checked={sendToUsers}
                    onCheckedChange={(checked) => setSendToUsers(checked as boolean)}
                  />
                  <Label htmlFor="sendToUsers">Invia a tutti gli utenti registrati</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sendToDeliverers" 
                    checked={sendToDeliverers}
                    onCheckedChange={(checked) => setSendToDeliverers(checked as boolean)}
                  />
                  <Label htmlFor="sendToDeliverers">Invia anche ai deliverer</Label>
                </div>
              </div>

              <Button 
                onClick={handleSendNotification}
                disabled={unnotifiedCount === 0 || sendingEmail || (!sendToUsers && !sendToDeliverers)}
                className="w-full"
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Invia Comunicazione Ufficiale
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Blocked Dates List */}
          <Card>
            <CardHeader>
              <CardTitle>Date Bloccate Programmate</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBlockedDates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nessuna data bloccata programmata
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {upcomingBlockedDates.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: it })}
                          </span>
                          {entry.is_holiday && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800">
                              <PartyPopper className="h-3 w-3 mr-1" />
                              {entry.holiday_name}
                            </Badge>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground">{entry.reason}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {entry.notification_sent_at ? (
                            <Badge variant="secondary" className="text-xs">
                              Notificato {format(new Date(entry.notification_sent_at), "dd/MM/yyyy")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Non notificato
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBlockedDate(entry.date)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
