import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Camera, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

interface AlcoholVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

const AlcoholVerificationDialog = ({ open, onOpenChange, onVerified }: AlcoholVerificationDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Devi essere autenticato");
        return;
      }

      // Upload document to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/alcohol-verification-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('deliverer-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('deliverer-documents')
        .getPublicUrl(filePath);

      // Update profile only if user agreed to save for future
      if (saveToProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            alcohol_verified: true,
            alcohol_document_url: urlData.publicUrl,
            alcohol_verified_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
        
        toast.success("Documento caricato e salvato! Non dovrai più verificare l'età per i prossimi ordini.");
      } else {
        // Just verify for this order, don't save to profile
        toast.success("Documento verificato per questo ordine.");
      }
      
      onVerified();
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("Errore nel caricamento del documento");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Verifica Età Richiesta
          </DialogTitle>
          <DialogDescription>
            Il tuo ordine contiene alcolici. Per legge, è necessario verificare che tu abbia almeno 18 anni.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
              📜 Riferimento normativo:
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 italic">
              Art. 689 del Codice Penale: "Chiunque somministra bevande alcoliche a minori di anni 18 è punito con la sanzione amministrativa pecuniaria..."
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 italic mt-2">
              Legge 189/2012, Art. 7: "È vietata la vendita e la somministrazione di bevande alcoliche ai minori di anni diciotto."
            </p>
          </div>

          <div className="space-y-2">
            <Label>Carica un documento d'identità valido</Label>
            <p className="text-xs text-muted-foreground">
              Carta d'identità, patente o passaporto. Il documento sarà utilizzato solo per la verifica dell'età.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="h-24 flex-col gap-2"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <Camera className="h-8 w-8" />
                  <span className="text-xs">Scatta foto</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-24 flex-col gap-2"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <Upload className="h-8 w-8" />
                  <span className="text-xs">Carica file</span>
                </>
              )}
            </Button>
          </div>

          {/* Save to profile checkbox */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="save-to-profile"
              checked={saveToProfile}
              onCheckedChange={(checked) => setSaveToProfile(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="save-to-profile" className="text-sm font-medium cursor-pointer">
                Salva nei dati personali per le prossime spese
              </Label>
              <p className="text-xs text-muted-foreground">
                Se attivo, non dovrai più caricare il documento per i prossimi ordini con alcolici
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            I tuoi dati sono protetti e trattati secondo il GDPR
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
            Annulla ordine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlcoholVerificationDialog;
