import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Heart, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderFeedbackWithTipProps {
  orderId: string;
  delivererId: string;
  delivererName: string;
  onComplete?: () => void;
}

const TIP_OPTIONS = [
  { value: 0, label: "Nessuna" },
  { value: 1, label: "€1" },
  { value: 2, label: "€2" },
  { value: 3, label: "€3" },
  { value: 5, label: "€5" },
];

export const OrderFeedbackWithTip = ({ 
  orderId, 
  delivererId, 
  delivererName,
  onComplete 
}: OrderFeedbackWithTipProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Seleziona una valutazione");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      // Calculate final tip
      const finalTip = customTip ? parseFloat(customTip) : tipAmount;

      // Insert feedback
      const { error: feedbackError } = await supabase
        .from('order_feedback')
        .insert({
          order_id: orderId,
          deliverer_id: delivererId,
          rating,
          comment: comment || null,
        });

      if (feedbackError) throw feedbackError;

      // Calculate rider share for notification
      let riderShare = 0;

      // Insert tip if any
      if (finalTip > 0) {
        riderShare = finalTip * 0.8; // 80% to rider
        const platformShare = finalTip * 0.2; // 20% to platform

        const { error: tipError } = await supabase
          .from('order_tips')
          .insert({
            order_id: orderId,
            user_id: user.id,
            deliverer_id: delivererId,
            tip_amount: finalTip,
            rider_share: riderShare,
            platform_share: platformShare,
          });

        if (tipError) throw tipError;
      }

      // Notify deliverer via Telegram (fire and forget)
      supabase.functions.invoke('notify-deliverer-feedback', {
        body: {
          orderId,
          delivererId,
          rating,
          comment: comment || null,
          tipAmount: finalTip,
          riderShare,
        }
      }).catch(err => console.error('Error notifying deliverer:', err));

      toast.success(
        finalTip > 0 
          ? `Grazie per il feedback e la mancia di €${finalTip.toFixed(2)}!`
          : "Grazie per il feedback!"
      );
      
      onComplete?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error("Errore durante l'invio del feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Valuta la consegna
        </CardTitle>
        <CardDescription>
          Come è andata la consegna con {delivererName}?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Star Rating */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-10 w-10 transition-colors",
                  (hoverRating || rating) >= star
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <div>
          <Textarea
            placeholder="Lascia un commento (opzionale)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {/* Tip Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-red-500" />
            <span>Vuoi lasciare una mancia a {delivererName}?</span>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            L'80% della mancia va direttamente al rider
          </p>
          
          <div className="flex flex-wrap justify-center gap-2">
            {TIP_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={tipAmount === option.value && !customTip ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTipAmount(option.value);
                  setCustomTip("");
                }}
                className="min-w-[60px]"
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">oppure</span>
            <div className="relative w-24">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="Altro"
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTipAmount(0);
                }}
                className="w-full pl-7 pr-3 py-2 text-sm border rounded-md bg-background"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={submitting || rating === 0}
          className="w-full"
          size="lg"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Invio..." : "Invia feedback"}
        </Button>
      </CardContent>
    </Card>
  );
};
