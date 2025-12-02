import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowRight, Sparkles } from "lucide-react";

interface SubscriptionBannerProps {
  variant?: "full" | "compact";
}

export const SubscriptionBanner = ({ variant = "full" }: SubscriptionBannerProps) => {
  const navigate = useNavigate();

  if (variant === "compact") {
    return (
      <Card 
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => navigate("/abbonamenti")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Alfredo Extra</p>
                <p className="text-xs text-muted-foreground">Da €39,90/mese</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background border-primary/30">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="p-6 relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold">Alfredo Extra</h3>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Nuovo
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Risparmia fino al 33% sul product picking e goditi consegne incluse ogni mese
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">5+ consegne/mese</Badge>
                <Badge variant="outline" className="text-xs">Priorità ordini</Badge>
                <Badge variant="outline" className="text-xs">Cashback</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-right">
              <span className="text-2xl font-bold">€39,90</span>
              <span className="text-muted-foreground text-sm">/mese</span>
            </div>
            <Button onClick={() => navigate("/abbonamenti")} className="group">
              Scopri i piani
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
