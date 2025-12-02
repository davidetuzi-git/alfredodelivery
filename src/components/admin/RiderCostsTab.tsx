import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bike, DollarSign, Cloud, Clock, Target, TrendingUp, 
  Save, Plus, Trash2, Euro, Percent, AlertCircle,
  Sunrise, MapPin, Star
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CompensationConfig {
  id: string;
  base_delivery_fee_min: number;
  base_delivery_fee_max: number;
  picking_fee_per_item: number;
  distance_bonus_per_km: number;
  distance_bonus_threshold_km: number;
  weather_bonus_enabled: boolean;
  weather_bonus_amount: number;
  peak_time_multiplier: number;
  high_demand_multiplier: number;
  rider_tip_percentage: number;
  first_order_bonus: number;
  uncovered_zone_bonus: number;
  rating_bonus_threshold: number;
  rating_bonus_amount: number;
}

interface Mission {
  id: string;
  title: string;
  description: string | null;
  target_deliveries: number | null;
  target_hours_start: string | null;
  target_hours_end: string | null;
  bonus_amount: number;
  bonus_percentage: number | null;
  valid_from: string;
  valid_until: string;
  active: boolean;
}

interface RiderEarning {
  id: string;
  deliverer_id: string;
  order_id: string;
  base_fee: number;
  picking_fee: number;
  distance_bonus: number;
  weather_bonus: number;
  peak_bonus: number;
  tip_amount: number;
  total_earnings: number;
  paid_at: string | null;
  created_at: string;
}

export const RiderCostsTab = () => {
  const [config, setConfig] = useState<CompensationConfig | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [earnings, setEarnings] = useState<RiderEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [newMission, setNewMission] = useState({
    title: "",
    description: "",
    target_deliveries: 10,
    bonus_amount: 20,
    valid_days: 7,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load compensation config
      const { data: configData, error: configError } = await supabase
        .from('rider_compensation_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (configError) throw configError;
      if (configData) setConfig(configData as unknown as CompensationConfig);

      // Load active missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('rider_missions')
        .select('*')
        .order('created_at', { ascending: false });

      if (missionsError) throw missionsError;
      setMissions((missionsData || []) as unknown as Mission[]);

      // Load recent earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('rider_earnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (earningsError) throw earningsError;
      setEarnings((earningsData || []) as unknown as RiderEarning[]);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('rider_compensation_config')
        .update({
          base_delivery_fee_min: config.base_delivery_fee_min,
          base_delivery_fee_max: config.base_delivery_fee_max,
          picking_fee_per_item: config.picking_fee_per_item,
          distance_bonus_per_km: config.distance_bonus_per_km,
          distance_bonus_threshold_km: config.distance_bonus_threshold_km,
          weather_bonus_enabled: config.weather_bonus_enabled,
          weather_bonus_amount: config.weather_bonus_amount,
          peak_time_multiplier: config.peak_time_multiplier,
          high_demand_multiplier: config.high_demand_multiplier,
          rider_tip_percentage: config.rider_tip_percentage,
          first_order_bonus: config.first_order_bonus,
          uncovered_zone_bonus: config.uncovered_zone_bonus,
          rating_bonus_threshold: config.rating_bonus_threshold,
          rating_bonus_amount: config.rating_bonus_amount,
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success("Configurazione salvata");
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMission = async () => {
    try {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + newMission.valid_days);

      const { error } = await supabase
        .from('rider_missions')
        .insert({
          title: newMission.title,
          description: newMission.description || null,
          target_deliveries: newMission.target_deliveries,
          bonus_amount: newMission.bonus_amount,
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
          active: true,
        });

      if (error) throw error;
      
      toast.success("Missione creata");
      setShowMissionDialog(false);
      setNewMission({ title: "", description: "", target_deliveries: 10, bonus_amount: 20, valid_days: 7 });
      loadData();
    } catch (error) {
      console.error('Error creating mission:', error);
      toast.error("Errore nella creazione");
    }
  };

  const handleToggleMission = async (missionId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('rider_missions')
        .update({ active })
        .eq('id', missionId);

      if (error) throw error;
      
      setMissions(prev => prev.map(m => m.id === missionId ? { ...m, active } : m));
      toast.success(active ? "Missione attivata" : "Missione disattivata");
    } catch (error) {
      console.error('Error toggling mission:', error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const totalEarnings = earnings.reduce((sum, e) => sum + e.total_earnings, 0);
  const totalTips = earnings.reduce((sum, e) => sum + e.tip_amount, 0);
  const avgEarning = earnings.length > 0 ? totalEarnings / earnings.length : 0;

  if (loading) {
    return <div className="p-8 text-center">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configurazione</TabsTrigger>
          <TabsTrigger value="missions">Missioni</TabsTrigger>
          <TabsTrigger value="earnings">Guadagni</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          {config && (
            <>
              {/* Base Compensation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Compenso Base per Consegna
                  </CardTitle>
                  <CardDescription>
                    Tariffa fissa che il rider riceve per ogni ordine completato
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Fee minima (€)</Label>
                    <Input
                      type="number"
                      step="0.50"
                      value={config.base_delivery_fee_min}
                      onChange={(e) => setConfig({ ...config, base_delivery_fee_min: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee massima (€)</Label>
                    <Input
                      type="number"
                      step="0.50"
                      value={config.base_delivery_fee_max}
                      onChange={(e) => setConfig({ ...config, base_delivery_fee_max: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee picking per articolo (€)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={config.picking_fee_per_item}
                      onChange={(e) => setConfig({ ...config, picking_fee_per_item: parseFloat(e.target.value) })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Distance Bonus */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bike className="h-5 w-5 text-primary" />
                    Bonus Distanza
                  </CardTitle>
                  <CardDescription>
                    Compenso extra per consegne oltre la soglia di distanza
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Soglia distanza (km)</Label>
                    <Input
                      type="number"
                      value={config.distance_bonus_threshold_km}
                      onChange={(e) => setConfig({ ...config, distance_bonus_threshold_km: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus per km extra (€)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={config.distance_bonus_per_km}
                      onChange={(e) => setConfig({ ...config, distance_bonus_per_km: parseFloat(e.target.value) })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Weather & Peak Bonuses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-primary" />
                    Bonus Variabili
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <Label>Bonus meteo avverso</Label>
                      <p className="text-sm text-muted-foreground">
                        Extra per pioggia, freddo, caldo estremo
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        step="0.50"
                        value={config.weather_bonus_amount}
                        onChange={(e) => setConfig({ ...config, weather_bonus_amount: parseFloat(e.target.value) })}
                        className="w-24"
                        disabled={!config.weather_bonus_enabled}
                      />
                      <span className="text-sm">€/ordine</span>
                      <Switch
                        checked={config.weather_bonus_enabled}
                        onCheckedChange={(checked) => setConfig({ ...config, weather_bonus_enabled: checked })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Moltiplicatore peak-time
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          value={config.peak_time_multiplier}
                          onChange={(e) => setConfig({ ...config, peak_time_multiplier: parseFloat(e.target.value) })}
                        />
                        <span className="text-sm text-muted-foreground">x</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Moltiplicatore alta domanda
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          value={config.high_demand_multiplier}
                          onChange={(e) => setConfig({ ...config, high_demand_multiplier: parseFloat(e.target.value) })}
                        />
                        <span className="text-sm text-muted-foreground">x</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Bonuses */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Bonus Aggiuntivi
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2">
                            <Sunrise className="h-4 w-4 text-orange-500" />
                            Bonus primo ordine del giorno
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Extra per la prima consegna della giornata
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.50"
                            value={config.first_order_bonus}
                            onChange={(e) => setConfig({ ...config, first_order_bonus: parseFloat(e.target.value) })}
                            className="w-20"
                          />
                          <span className="text-sm">€</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-500" />
                            Bonus zona scoperta
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Extra per consegne in zone poco servite
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.50"
                            value={config.uncovered_zone_bonus}
                            onChange={(e) => setConfig({ ...config, uncovered_zone_bonus: parseFloat(e.target.value) })}
                            className="w-20"
                          />
                          <span className="text-sm">€</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            Bonus rating elevato
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Extra per rider con rating superiore alla soglia
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Soglia:</span>
                            <Input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={config.rating_bonus_threshold}
                              onChange={(e) => setConfig({ ...config, rating_bonus_threshold: parseFloat(e.target.value) })}
                              className="w-20"
                            />
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Bonus:</span>
                            <Input
                              type="number"
                              step="0.25"
                              value={config.rating_bonus_amount}
                              onChange={(e) => setConfig({ ...config, rating_bonus_amount: parseFloat(e.target.value) })}
                              className="w-20"
                            />
                            <span className="text-sm">€/ordine</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Mance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Label>Percentuale mancia al rider</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={config.rider_tip_percentage}
                      onChange={(e) => setConfig({ ...config, rider_tip_percentage: parseInt(e.target.value) })}
                      className="w-24"
                    />
                    <span>%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Il restante {100 - config.rider_tip_percentage}% va alla piattaforma
                  </p>
                </CardContent>
              </Card>

              <Button onClick={handleSaveConfig} disabled={saving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvataggio..." : "Salva Configurazione"}
              </Button>
            </>
          )}
        </TabsContent>

        {/* Missions Tab */}
        <TabsContent value="missions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Missioni & Incentivi</h3>
            <Dialog open={showMissionDialog} onOpenChange={setShowMissionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Missione
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Nuova Missione</DialogTitle>
                  <DialogDescription>
                    Incentiva i rider con obiettivi settimanali
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Titolo</Label>
                    <Input
                      placeholder="es. Super Settimana"
                      value={newMission.title}
                      onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea
                      placeholder="Descrizione della missione..."
                      value={newMission.description}
                      onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Consegne richieste</Label>
                      <Input
                        type="number"
                        value={newMission.target_deliveries}
                        onChange={(e) => setNewMission({ ...newMission, target_deliveries: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bonus (€)</Label>
                      <Input
                        type="number"
                        value={newMission.bonus_amount}
                        onChange={(e) => setNewMission({ ...newMission, bonus_amount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Durata (giorni)</Label>
                      <Input
                        type="number"
                        value={newMission.valid_days}
                        onChange={(e) => setNewMission({ ...newMission, valid_days: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateMission} disabled={!newMission.title}>
                    Crea Missione
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {missions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna missione attiva</p>
                <p className="text-sm">Crea una missione per incentivare i rider</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {missions.map((mission) => (
                <Card key={mission.id} className={!mission.active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{mission.title}</h4>
                          <Badge variant={mission.active ? "default" : "secondary"}>
                            {mission.active ? "Attiva" : "Inattiva"}
                          </Badge>
                        </div>
                        {mission.description && (
                          <p className="text-sm text-muted-foreground">{mission.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span>🎯 {mission.target_deliveries} consegne</span>
                          <span>💰 €{mission.bonus_amount}</span>
                          <span className="text-muted-foreground">
                            Scade: {format(new Date(mission.valid_until), 'dd MMM', { locale: it })}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={mission.active}
                        onCheckedChange={(checked) => handleToggleMission(mission.id, checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">€{totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Totale guadagni rider</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">€{totalTips.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Totale mance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">€{avgEarning.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Media per ordine</p>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Storico Guadagni</CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun guadagno registrato</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Picking</TableHead>
                      <TableHead className="text-right">Bonus</TableHead>
                      <TableHead className="text-right">Mancia</TableHead>
                      <TableHead className="text-right">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((earning) => (
                      <TableRow key={earning.id}>
                        <TableCell>
                          {format(new Date(earning.created_at), 'dd/MM/yy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">€{earning.base_fee.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{earning.picking_fee.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          €{(earning.distance_bonus + earning.weather_bonus + earning.peak_bonus).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          €{earning.tip_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          €{earning.total_earnings.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
