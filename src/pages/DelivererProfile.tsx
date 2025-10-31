import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Save, MessageCircle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";

interface Deliverer {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  current_orders: number;
  max_orders: number;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
  base_address: string | null;
  operating_radius_km: number | null;
  telegram_chat_id: string | null;
  avatar_url: string | null;
  rating: number | null;
  total_deliveries: number | null;
  on_time_deliveries: number | null;
}

interface AddressChangeRequest {
  id: string;
  status: string;
  requested_address: string;
  created_at: string;
}

const DelivererProfile = () => {
  const navigate = useNavigate();
  const [deliverer, setDeliverer] = useState<Deliverer | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseAddress, setBaseAddress] = useState("");
  const [baseLatitude, setBaseLatitude] = useState<number | null>(null);
  const [baseLongitude, setBaseLongitude] = useState<number | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [submittingAddressRequest, setSubmittingAddressRequest] = useState(false);
  const [addressChangeRequest, setAddressChangeRequest] = useState<AddressChangeRequest | null>(null);

  useEffect(() => {
    loadDelivererData();
  }, []);

  const loadDelivererData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/deliverer-auth');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'deliverer')
        .single();

      if (!roles) {
        toast.error("Non hai i permessi per accedere a questa pagina");
        navigate('/');
        return;
      }

      const { data: delivererData, error: delivererError } = await supabase
        .from('deliverers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (delivererError) {
        toast.error("Errore nel caricamento dei dati");
        return;
      }

      setDeliverer(delivererData);
      
      if (delivererData.telegram_chat_id) {
        setTelegramChatId(delivererData.telegram_chat_id);
      }

      // Carica richieste di modifica indirizzo in sospeso
      const { data: requestData } = await supabase
        .from('deliverer_address_requests')
        .select('*')
        .eq('deliverer_id', delivererData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestData) {
        setAddressChangeRequest(requestData);
      }
    } catch (error: any) {
      console.error("Error loading deliverer data:", error);
      navigate('/deliverer-auth');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAddressChange = async () => {
    if (!baseLatitude || !baseLongitude || !deliverer || !baseAddress) {
      toast.error("Seleziona un indirizzo dalla lista");
      return;
    }

    setSubmittingAddressRequest(true);
    try {
      const { error } = await supabase
        .from('deliverer_address_requests')
        .insert({
          deliverer_id: deliverer.id,
          requested_address: baseAddress,
          requested_latitude: baseLatitude,
          requested_longitude: baseLongitude,
        });

      if (error) throw error;

      toast.success("Richiesta di modifica inviata! Attendi l'approvazione dell'admin");
      
      // Ricarica i dati
      await loadDelivererData();

      // Reset form
      setBaseAddress("");
      setBaseLatitude(null);
      setBaseLongitude(null);
    } catch (error: any) {
      console.error("Error submitting address request:", error);
      toast.error("Errore nell'invio della richiesta");
    } finally {
      setSubmittingAddressRequest(false);
    }
  };

  const handleSaveTelegramChatId = async () => {
    if (!telegramChatId.trim() || !deliverer) {
      toast.error("Inserisci un chat_id valido");
      return;
    }

    setSavingTelegram(true);
    try {
      const { error } = await supabase
        .from('deliverers')
        .update({ telegram_chat_id: telegramChatId.trim() })
        .eq('id', deliverer.id);

      if (error) throw error;

      toast.success("Chat ID Telegram salvato! Riceverai notifiche su Telegram");
      await loadDelivererData();
    } catch (error: any) {
      console.error("Error saving telegram chat_id:", error);
      toast.error("Errore nel salvataggio del chat_id");
    } finally {
      setSavingTelegram(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!deliverer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => navigate('/deliverer-dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Il Mio Profilo</h1>

        {/* Indirizzo Base */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Indirizzo Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliverer.base_address ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <MapPin className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Indirizzo configurato
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {deliverer.base_address}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Raggio operativo: {deliverer.operating_radius_km || 10} km
                    </p>
                  </div>
                </div>

                {addressChangeRequest ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      📋 Richiesta di modifica in attesa
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Nuovo indirizzo: {addressChangeRequest.requested_address}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      In attesa di approvazione admin
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-sm font-medium">Richiedi modifica indirizzo</p>
                    <AddressAutocomplete
                      value={baseAddress}
                      onSelect={(address, lat, lon) => {
                        setBaseAddress(address);
                        setBaseLatitude(lat);
                        setBaseLongitude(lon);
                      }}
                      placeholder="Nuovo indirizzo base"
                    />
                    <Button 
                      onClick={handleRequestAddressChange}
                      disabled={!baseLatitude || !baseLongitude || submittingAddressRequest}
                      className="w-full"
                      variant="outline"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {submittingAddressRequest ? "Invio..." : "Richiedi Modifica"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <MapPin className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Configura il tuo indirizzo base
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Riceverai notifiche per ordini entro 10 km dal tuo indirizzo
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="base-address">Inserisci il tuo indirizzo base</Label>
                  <AddressAutocomplete
                    value={baseAddress}
                    onSelect={(address, lat, lon) => {
                      setBaseAddress(address);
                      setBaseLatitude(lat);
                      setBaseLongitude(lon);
                    }}
                    placeholder="Via Roma 1, Milano, MI"
                  />
                </div>

                <Button 
                  onClick={handleRequestAddressChange}
                  disabled={!baseLatitude || !baseLongitude || submittingAddressRequest}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {submittingAddressRequest ? "Invio..." : "Richiedi Configurazione"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifiche Telegram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Notifiche Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliverer.telegram_chat_id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Telegram configurato! ✅
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Chat ID: {deliverer.telegram_chat_id}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-chatid">Aggiorna Chat ID</Label>
                  <Input
                    id="telegram-chatid"
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    💬 Attiva notifiche Telegram
                  </p>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside mb-3">
                    <li>Cerca <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">@Alfredo257_bot</code> su Telegram</li>
                    <li>Invia <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/start</code></li>
                    <li>Il bot ti risponderà con il tuo chat_id</li>
                    <li>Copia il numero qui sotto e salva</li>
                  </ol>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telegram-chatid">Il tuo Chat ID Telegram</Label>
                  <Input
                    id="telegram-chatid"
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleSaveTelegramChatId}
              disabled={!telegramChatId.trim() || savingTelegram}
              className="w-full"
              variant="outline"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {savingTelegram ? "Salvataggio..." : "Salva Chat ID Telegram"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DelivererProfile;
