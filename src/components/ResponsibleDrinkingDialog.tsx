import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wine, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ResponsibleDrinkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const ResponsibleDrinkingDialog = ({ open, onOpenChange, onAccept }: ResponsibleDrinkingDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-primary" />
            Informativa sul Consumo Responsabile
          </DialogTitle>
          <DialogDescription>
            Il tuo ordine contiene bevande alcoliche
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  BEVI RESPONSABILMENTE
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  L'abuso di alcol è dannoso per la salute.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-2">📜 Normativa italiana:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Art. 689 C.P.:</strong> È vietato somministrare o vendere bevande alcoliche a persone in stato di manifesta ubriachezza o a minori di anni 18.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Legge 189/2012:</strong> "Chiunque vende bevande alcoliche ha l'obbligo di chiedere all'acquirente, all'atto dell'acquisto, l'esibizione di un documento di identità, tranne nei casi in cui la maggiore età dell'acquirente sia manifesta."
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>D.L. 158/2012:</strong> Sanzioni da €250 a €1.000 per chi vende o somministra alcolici ai minori, con possibile sospensione dell'attività.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Divieti importanti:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                <li>• Vietata la vendita ai minori di 18 anni</li>
                <li>• Vietato guidare in stato di ebbrezza (limite 0,5 g/l)</li>
                <li>• Vietato somministrare alcolici a persone già in stato di ubriachezza</li>
              </ul>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm">
                <strong>Ricorda:</strong> Il nostro shopper verificherà l'età al momento della consegna. 
                Sarà necessario mostrare un documento d'identità valido.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Torna all'ordine
          </Button>
          <Button 
            type="button" 
            onClick={() => {
              onAccept();
              onOpenChange(false);
            }}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Ho letto e accetto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResponsibleDrinkingDialog;
