import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Ticket } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Voucher {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
  created_at: string;
}

export const VouchersTab = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers((data as Voucher[]) || []);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i voucher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountType('percentage');
    setDiscountValue("");
    setMinOrderAmount("");
    setMaxUses("");
    setValidFrom("");
    setValidUntil("");
    setActive(true);
    setEditingVoucher(null);
  };

  const openEditDialog = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setCode(voucher.code);
    setDescription(voucher.description || "");
    setDiscountType(voucher.discount_type);
    setDiscountValue(voucher.discount_value.toString());
    setMinOrderAmount(voucher.min_order_amount?.toString() || "0");
    setMaxUses(voucher.max_uses?.toString() || "");
    setValidFrom(voucher.valid_from.split('T')[0]);
    setValidUntil(voucher.valid_until.split('T')[0]);
    setActive(voucher.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code || !discountValue || !validFrom || !validUntil) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      const voucherData = {
        code: code.toUpperCase(),
        description,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_amount: parseFloat(minOrderAmount) || 0,
        max_uses: maxUses ? parseInt(maxUses) : null,
        valid_from: new Date(validFrom).toISOString(),
        valid_until: new Date(validUntil + 'T23:59:59').toISOString(),
        active,
      };

      if (editingVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update(voucherData)
          .eq('id', editingVoucher.id);

        if (error) throw error;
        toast({
          title: "Voucher aggiornato!",
          description: "Il voucher è stato modificato con successo",
        });
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert(voucherData);

        if (error) throw error;
        toast({
          title: "Voucher creato!",
          description: "Il nuovo voucher è stato creato con successo",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadVouchers();
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare il voucher",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo voucher?")) return;

    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Voucher eliminato",
        description: "Il voucher è stato eliminato con successo",
      });
      loadVouchers();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il voucher",
        variant: "destructive",
      });
    }
  };

  const isVoucherValid = (voucher: Voucher) => {
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = new Date(voucher.valid_until);
    return voucher.active && now >= validFrom && now <= validUntil;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestione Voucher</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVoucher ? "Modifica Voucher" : "Nuovo Voucher"}
              </DialogTitle>
              <DialogDescription>
                Crea o modifica un codice sconto per i clienti
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Codice Voucher *</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ES: WELCOME10"
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stato</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch checked={active} onCheckedChange={setActive} />
                    <Label>{active ? "Attivo" : "Disattivato"}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrizione del voucher..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType">Tipo Sconto *</Label>
                  <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentuale (%)</SelectItem>
                      <SelectItem value="fixed">Importo Fisso (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Valore Sconto * {discountType === 'percentage' ? '(%)' : '(€)'}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? "10" : "5.00"}
                    min="0"
                    step={discountType === 'percentage' ? "1" : "0.01"}
                    max={discountType === 'percentage' ? "100" : undefined}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minOrderAmount">Ordine Minimo (€)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxUses">Utilizzi Massimi</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Illimitato"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valido Da *</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valido Fino *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSave}>
                  {editingVoucher ? "Aggiorna" : "Crea"} Voucher
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {vouchers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nessun voucher</h3>
              <p className="text-muted-foreground mb-6">
                Crea il primo voucher per offrire sconti ai tuoi clienti
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Primo Voucher
              </Button>
            </CardContent>
          </Card>
        ) : (
          vouchers.map((voucher) => (
            <Card key={voucher.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg font-mono">{voucher.code}</CardTitle>
                      {voucher.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {voucher.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVoucherValid(voucher) ? (
                      <Badge className="bg-green-500">Attivo</Badge>
                    ) : !voucher.active ? (
                      <Badge variant="secondary">Disattivato</Badge>
                    ) : new Date() < new Date(voucher.valid_from) ? (
                      <Badge variant="outline">Non ancora valido</Badge>
                    ) : (
                      <Badge variant="destructive">Scaduto</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sconto</p>
                    <p className="font-semibold">
                      {voucher.discount_type === 'percentage'
                        ? `${voucher.discount_value}%`
                        : `€${voucher.discount_value.toFixed(2)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordine minimo</p>
                    <p className="font-semibold">€{voucher.min_order_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Utilizzi</p>
                    <p className="font-semibold">
                      {voucher.current_uses}
                      {voucher.max_uses ? ` / ${voucher.max_uses}` : ' / ∞'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Validità</p>
                    <p className="text-sm">
                      {format(new Date(voucher.valid_from), 'dd MMM', { locale: it })} -{' '}
                      {format(new Date(voucher.valid_until), 'dd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(voucher)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(voucher.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
