import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Camera, X, Loader2, Send, ImageIcon } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
}

interface ComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  items: OrderItem[];
  onComplaintSubmitted?: () => void;
}

export const ComplaintDialog = ({
  open,
  onOpenChange,
  orderId,
  orderCode,
  items,
  onComplaintSubmitted,
}: ComplaintDialogProps) => {
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Puoi caricare massimo 5 foto");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} troppo grande (max 10MB)`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleItem = (itemName: string) => {
    setSelectedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(i => i !== itemName)
        : [...prev, itemName]
    );
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Descrivi il problema riscontrato");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      const userName = profile 
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() 
        : user.email?.split("@")[0];

      // Upload images
      const imageUrls: string[] = [];
      for (const image of images) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${user.id}/${orderId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("complaint-images")
          .upload(fileName, image);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          continue;
        }

        // Get signed URL
        const { data: urlData } = await supabase.storage
          .from("complaint-images")
          .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days

        if (urlData?.signedUrl) {
          imageUrls.push(urlData.signedUrl);
        }
      }

      // Insert complaint
      const { data: complaint, error: complaintError } = await supabase
        .from("complaints")
        .insert({
          order_id: orderId,
          user_id: user.id,
          description: description.trim(),
          items_affected: selectedItems.length > 0 ? selectedItems : null,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      // Notify admin via edge function
      await supabase.functions.invoke("handle-complaint", {
        body: {
          complaintId: complaint.id,
          orderId,
          description: description.trim(),
          itemsAffected: selectedItems,
          imageUrls,
          userName,
          userEmail: user.email,
          orderCode,
        },
      });

      toast.success("Reclamo inviato! Ti contatteremo presto.");
      
      // Reset form
      setDescription("");
      setSelectedItems([]);
      setImages([]);
      setImagePreviews([]);
      
      onOpenChange(false);
      onComplaintSubmitted?.();
    } catch (error) {
      console.error("Error submitting complaint:", error);
      toast.error("Errore nell'invio del reclamo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Segnala un Problema
          </DialogTitle>
          <DialogDescription>
            Ordine {orderCode} - Hai 2 ore dalla consegna per segnalare eventuali problemi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrivi il problema *</Label>
            <Textarea
              id="description"
              placeholder="Descrivi cosa è andato storto (articoli mancanti, danneggiati, errati, ecc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Items selection */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Articoli coinvolti (opzionale)</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      id={`item-${index}`}
                      checked={selectedItems.includes(item.name)}
                      onCheckedChange={() => toggleItem(item.name)}
                    />
                    <label
                      htmlFor={`item-${index}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {item.name} (x{item.quantity})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Foto del problema (opzionale)</Label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs mt-1">Aggiungi</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Max 5 foto, 10MB ciascuna
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !description.trim()}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Invio...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invia Segnalazione
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
