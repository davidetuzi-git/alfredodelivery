import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { UserSubmenu } from "@/components/UserSubmenu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Package, Gift, Percent, Info, CheckCheck, Mail, Megaphone, Sparkles, TrendingUp, Send, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Notifications = () => {
  const { 
    notifications, 
    preferences, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    updatePreferences 
  } = useNotifications();

  const [telegramChatId, setTelegramChatId] = useState("");
  const [savedTelegramId, setSavedTelegramId] = useState<string | null>(null);
  const [savingTelegram, setSavingTelegram] = useState(false);

  useEffect(() => {
    loadTelegramSettings();
  }, []);

  const loadTelegramSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", session.user.id)
        .single();

      if (data?.telegram_chat_id) {
        setSavedTelegramId(data.telegram_chat_id);
        setTelegramChatId(data.telegram_chat_id);
      }
    } catch (error) {
      console.error("Error loading telegram settings:", error);
    }
  };

  const handleSaveTelegram = async () => {
    if (!telegramChatId.trim()) {
      toast.error("Inserisci un Chat ID valido");
      return;
    }

    setSavingTelegram(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Devi essere autenticato");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: telegramChatId.trim() })
        .eq("id", session.user.id);

      if (error) throw error;

      setSavedTelegramId(telegramChatId.trim());
      toast.success("Chat ID Telegram salvato!");
    } catch (error) {
      console.error("Error saving telegram:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleRemoveTelegram = async () => {
    setSavingTelegram(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: null })
        .eq("id", session.user.id);

      if (error) throw error;

      setSavedTelegramId(null);
      setTelegramChatId("");
      toast.success("Telegram disconnesso");
    } catch (error) {
      console.error("Error removing telegram:", error);
      toast.error("Errore nella rimozione");
    } finally {
      setSavingTelegram(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return Package;
      case "promo": return Percent;
      case "loyalty": return Gift;
      default: return Info;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "order": return "text-blue-500 bg-blue-500/10";
      case "promo": return "text-green-500 bg-green-500/10";
      case "loyalty": return "text-amber-500 bg-amber-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
      toast.success("Notifica letta");
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast.success("Tutte le notifiche segnate come lette");
  };

  const handlePreferenceChange = async (key: string, value: boolean) => {
    const success = await updatePreferences({ [key]: value });
    if (success) {
      toast.success("Preferenza aggiornata");
    } else {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: it });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Notifiche</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {unreadCount} nuove
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Segna tutte lette
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nessuna notifica</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le notifiche sui tuoi ordini appariranno qui
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <Card 
                  key={notification.id} 
                  className={`transition-all cursor-pointer hover:shadow-md ${
                    !notification.read 
                      ? "border-primary/30 bg-primary/5" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Separator className="my-8" />

        {/* Telegram Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[#0088cc]" />
              Notifiche Telegram
            </CardTitle>
            <CardDescription>
              Ricevi promemoria sulle tue consegne direttamente su Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedTelegramId ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Telegram connesso (ID: {savedTelegramId})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Riceverai notifiche 24 ore prima e 1 ora prima delle tue consegne programmate, 
                  oltre a quando il fattorino inizia la spesa.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveTelegram}
                  disabled={savingTelegram}
                >
                  Disconnetti Telegram
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm">Come ottenere il tuo Chat ID:</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      Apri Telegram e cerca{" "}
                      <a 
                        href="https://t.me/AlfredoDeliveryBot" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline inline-flex items-center gap-1"
                      >
                        @AlfredoDeliveryBot
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Invia il comando <code className="bg-muted px-1.5 py-0.5 rounded">/start</code></li>
                    <li>Il bot ti risponderà con il tuo Chat ID</li>
                    <li>Copia il Chat ID e incollalo qui sotto</li>
                  </ol>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Inserisci il tuo Chat ID"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                  />
                  <Button 
                    onClick={handleSaveTelegram}
                    disabled={savingTelegram || !telegramChatId.trim()}
                  >
                    {savingTelegram ? "Salvataggio..." : "Salva"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Communication Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Preferenze Comunicazioni
            </CardTitle>
            <CardDescription>
              Scegli quali comunicazioni desideri ricevere via email e notifiche push
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading || !preferences ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-6 w-10 bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="order_updates" className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Aggiornamenti ordini
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Stato consegna, conferme, ritardi
                    </p>
                  </div>
                  <Switch
                    id="order_updates"
                    checked={preferences.order_updates}
                    onCheckedChange={(checked) => handlePreferenceChange('order_updates', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="promotions" className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-green-500" />
                      Promozioni e sconti
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Offerte speciali, coupon, flash sale
                    </p>
                  </div>
                  <Switch
                    id="promotions"
                    checked={preferences.promotions}
                    onCheckedChange={(checked) => handlePreferenceChange('promotions', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newsletter" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-500" />
                      Newsletter
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Novità, consigli, ricette e ispirazioni
                    </p>
                  </div>
                  <Switch
                    id="newsletter"
                    checked={preferences.newsletter}
                    onCheckedChange={(checked) => handlePreferenceChange('newsletter', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="loyalty_updates" className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-amber-500" />
                      Programma fedeltà
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Punti guadagnati, livelli, premi disponibili
                    </p>
                  </div>
                  <Switch
                    id="loyalty_updates"
                    checked={preferences.loyalty_updates}
                    onCheckedChange={(checked) => handlePreferenceChange('loyalty_updates', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new_features" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-500" />
                      Nuove funzionalità
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Aggiornamenti app, nuovi servizi
                    </p>
                  </div>
                  <Switch
                    id="new_features"
                    checked={preferences.new_features}
                    onCheckedChange={(checked) => handlePreferenceChange('new_features', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

      </div>

      <Navigation />
    </div>
  );
};

export default Notifications;
