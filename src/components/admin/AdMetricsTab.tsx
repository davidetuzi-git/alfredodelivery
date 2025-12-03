import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, MousePointer, TrendingUp, Settings, Loader2, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface AdSlot {
  id: string;
  name: string;
  description: string | null;
  location: string;
  dimensions: string | null;
}

interface Advertisement {
  id: string;
  unique_name: string;
  client_name: string;
  description: string | null;
  link_url: string;
  image_url: string | null;
  slot_id: string | null;
  payment_amount: number;
  payment_status: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  ad_slots?: AdSlot | null;
}

interface AdMetric {
  ad_id: string;
  unique_impressions: number;
  total_clicks: number;
}

export const AdMetricsTab = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [metrics, setMetrics] = useState<AdMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    unique_name: "",
    client_name: "",
    description: "",
    link_url: "",
    image_url: "",
    slot_id: "",
    payment_amount: "",
    payment_status: "pending",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: adsData } = await supabase
        .from("advertisements")
        .select("*, ad_slots(*)")
        .order("created_at", { ascending: false });
      setAds((adsData as Advertisement[]) || []);

      const { data: slotsData } = await supabase
        .from("ad_slots")
        .select("*")
        .order("name");
      setSlots((slotsData as AdSlot[]) || []);

      const { data: impressionsData } = await supabase.from("ad_impressions").select("ad_id, user_id");
      const { data: clicksData } = await supabase.from("ad_clicks").select("ad_id");

      const metricsMap = new Map<string, AdMetric>();
      impressionsData?.forEach(imp => {
        const existing = metricsMap.get(imp.ad_id) || { ad_id: imp.ad_id, unique_impressions: 0, total_clicks: 0 };
        existing.unique_impressions++;
        metricsMap.set(imp.ad_id, existing);
      });
      clicksData?.forEach(click => {
        const existing = metricsMap.get(click.ad_id) || { ad_id: click.ad_id, unique_impressions: 0, total_clicks: 0 };
        existing.total_clicks++;
        metricsMap.set(click.ad_id, existing);
      });
      setMetrics(Array.from(metricsMap.values()));
    } catch (error) {
      console.error("Error loading ad data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const getOccupiedSlotIds = (): string[] => {
    const now = new Date();
    return ads
      .filter(ad => ad.slot_id && ad.is_active && new Date(ad.end_date) > now)
      .map(ad => ad.slot_id as string);
  };

  const isSlotAvailable = (slotId: string): boolean => {
    if (editingAd?.slot_id === slotId) return true;
    return !getOccupiedSlotIds().includes(slotId);
  };

  const resetForm = () => {
    setFormData({
      unique_name: "", client_name: "", description: "", link_url: "", image_url: "",
      slot_id: "", payment_amount: "", payment_status: "pending",
      start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", is_active: true
    });
    setEditingAd(null);
  };

  const openEditDialog = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      unique_name: ad.unique_name, client_name: ad.client_name, description: ad.description || "",
      link_url: ad.link_url, image_url: ad.image_url || "", slot_id: ad.slot_id || "",
      payment_amount: ad.payment_amount.toString(), payment_status: ad.payment_status,
      start_date: format(new Date(ad.start_date), "yyyy-MM-dd"),
      end_date: format(new Date(ad.end_date), "yyyy-MM-dd"), is_active: ad.is_active
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.unique_name || !formData.client_name || !formData.link_url || !formData.end_date) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        unique_name: formData.unique_name.trim(),
        client_name: formData.client_name.trim(),
        description: formData.description.trim() || null,
        link_url: formData.link_url.trim(),
        image_url: formData.image_url.trim() || null,
        slot_id: formData.slot_id || null,
        payment_amount: parseFloat(formData.payment_amount) || 0,
        payment_status: formData.payment_status,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: formData.is_active
      };

      if (editingAd) {
        const { error } = await supabase.from("advertisements").update(payload).eq("id", editingAd.id);
        if (error) throw error;
        toast.success("Pubblicità aggiornata");
      } else {
        const { error } = await supabase.from("advertisements").insert(payload);
        if (error) throw error;
        toast.success("Pubblicità creata");
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      if (error.code === "23505") toast.error("Nome univoco già esistente");
      else toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ad: Advertisement) => {
    if (!confirm(`Eliminare "${ad.unique_name}"?`)) return;
    try {
      await supabase.from("advertisements").delete().eq("id", ad.id);
      toast.success("Pubblicità eliminata");
      loadData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const getMetricsForAd = (adName: string) => metrics.find(m => m.ad_id === adName) || { unique_impressions: 0, total_clicks: 0 };
  const isAdExpired = (endDate: string) => new Date(endDate) < new Date();
  const totalImpressions = metrics.reduce((acc, m) => acc + m.unique_impressions, 0);
  const totalClicks = metrics.reduce((acc, m) => acc + m.total_clicks, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ads" className="w-full">
        <TabsList>
          <TabsTrigger value="ads" className="flex items-center gap-2"><Settings className="h-4 w-4" />Gestione</TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Metriche</TabsTrigger>
          <TabsTrigger value="slots" className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" />Slot</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Pubblicità ({ads.length})</h3>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nuova Pubblicità</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingAd ? "Modifica Pubblicità" : "Nuova Pubblicità"}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Univoco *</Label>
                      <Input value={formData.unique_name} onChange={e => setFormData(p => ({ ...p, unique_name: e.target.value }))} placeholder="es. promo_natale_2024" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cliente *</Label>
                      <Input value={formData.client_name} onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))} placeholder="Nome azienda" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Descrizione campagna..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Link Promozione *</Label>
                      <Input type="url" value={formData.link_url} onChange={e => setFormData(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <Label>URL Immagine</Label>
                      <Input type="url" value={formData.image_url} onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Slot</Label>
                      <Select value={formData.slot_id || "none"} onValueChange={v => setFormData(p => ({ ...p, slot_id: v === "none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleziona slot" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuno slot</SelectItem>
                          {slots.map(slot => (
                            <SelectItem key={slot.id} value={slot.id} disabled={!isSlotAvailable(slot.id)}>
                              {slot.name} {slot.dimensions && `(${slot.dimensions})`}{!isSlotAvailable(slot.id) && " - Occupato"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Stato Pagamento</Label>
                      <Select value={formData.payment_status} onValueChange={v => setFormData(p => ({ ...p, payment_status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">In attesa</SelectItem>
                          <SelectItem value="paid">Pagato</SelectItem>
                          <SelectItem value="cancelled">Annullato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Importo (€)</Label>
                      <Input type="number" step="0.01" value={formData.payment_amount} onChange={e => setFormData(p => ({ ...p, payment_amount: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Inizio *</Label>
                      <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fine *</Label>
                      <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4" />
                    <Label htmlFor="is_active">Attiva</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingAd ? "Salva" : "Crea"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nessuna pubblicità</TableCell></TableRow>
                  ) : ads.map(ad => (
                    <TableRow key={ad.id} className={isAdExpired(ad.end_date) ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{ad.unique_name}</TableCell>
                      <TableCell>{ad.client_name}</TableCell>
                      <TableCell>{ad.ad_slots ? <Badge variant="outline">{ad.ad_slots.name}</Badge> : "-"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(ad.start_date), "dd/MM/yy", { locale: it })} - {format(new Date(ad.end_date), "dd/MM/yy", { locale: it })}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">€{ad.payment_amount.toFixed(2)}</span>
                          <Badge variant={ad.payment_status === "paid" ? "default" : ad.payment_status === "cancelled" ? "destructive" : "outline"} className={ad.payment_status === "paid" ? "bg-green-500" : ""}>
                            {ad.payment_status === "paid" ? "Pagato" : ad.payment_status === "pending" ? "In attesa" : "Annullato"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdExpired(ad.end_date) ? <Badge variant="secondary">Scaduta</Badge> : ad.is_active ? <Badge className="bg-green-500">Attiva</Badge> : <Badge variant="outline">Disattivata</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(ad)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(ad)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div><div><p className="text-sm text-muted-foreground">Impressioni Uniche</p><p className="text-2xl font-bold">{totalImpressions}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><MousePointer className="h-6 w-6 text-green-600 dark:text-green-400" /></div><div><p className="text-sm text-muted-foreground">Click Totali</p><p className="text-2xl font-bold">{totalClicks}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" /></div><div><p className="text-sm text-muted-foreground">CTR Medio</p><p className="text-2xl font-bold">{avgCtr}%</p></div></div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Performance per Pubblicità</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pubblicità</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Impression</TableHead><TableHead className="text-right">Click</TableHead><TableHead className="text-right">CTR</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ads.map(ad => {
                    const m = getMetricsForAd(ad.unique_name);
                    const ctr = m.unique_impressions > 0 ? ((m.total_clicks / m.unique_impressions) * 100).toFixed(2) : "0.00";
                    return (
                      <TableRow key={ad.id}>
                        <TableCell className="font-medium">{ad.unique_name}</TableCell>
                        <TableCell>{ad.client_name}</TableCell>
                        <TableCell className="text-right">{m.unique_impressions}</TableCell>
                        <TableCell className="text-right">{m.total_clicks}</TableCell>
                        <TableCell className="text-right"><Badge variant={parseFloat(ctr) > 5 ? "default" : "outline"}>{ctr}%</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slots" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Slot Pubblicitari</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Posizione</TableHead><TableHead>Dimensioni</TableHead><TableHead>Stato</TableHead><TableHead>Occupato da</TableHead></TableRow></TableHeader>
                <TableBody>
                  {slots.map(slot => {
                    const occupyingAd = ads.find(ad => ad.slot_id === slot.id && ad.is_active && new Date(ad.end_date) > new Date());
                    return (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">{slot.name}</TableCell>
                        <TableCell><Badge variant="outline">{slot.location}</Badge></TableCell>
                        <TableCell>{slot.dimensions || "-"}</TableCell>
                        <TableCell>{occupyingAd ? <Badge variant="destructive">Occupato</Badge> : <Badge className="bg-green-500">Disponibile</Badge>}</TableCell>
                        <TableCell>{occupyingAd ? <div className="text-sm"><span className="font-medium">{occupyingAd.unique_name}</span><br/><span className="text-muted-foreground">fino al {format(new Date(occupyingAd.end_date), "dd/MM/yyyy", { locale: it })}</span></div> : "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
