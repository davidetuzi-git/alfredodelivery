import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLoyalty, LOYALTY_LEVELS, LoyaltyLevel } from "@/hooks/useLoyalty";
import { Trophy, Gift, Star, ArrowRight, Copy, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LoyaltyCardProps {
  compact?: boolean;
}

export const LoyaltyCard = ({ compact = false }: LoyaltyCardProps) => {
  const navigate = useNavigate();
  const { loyaltyProfile, loading, getBenefits, getPointsValue } = useLoyalty();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <Card className={compact ? "" : "overflow-hidden"}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loyaltyProfile) {
    return null;
  }

  const level = loyaltyProfile.current_level as LoyaltyLevel;
  const levelInfo = LOYALTY_LEVELS[level];
  const benefits = getBenefits(level);
  const pointsValue = getPointsValue(loyaltyProfile.points_balance);

  const progressToNextLevel = benefits.nextLevelThreshold
    ? Math.min((loyaltyProfile.monthly_orders_count / benefits.nextLevelThreshold) * 100, 100)
    : 100;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(loyaltyProfile.referral_code);
    setCopied(true);
    toast.success("Codice referral copiato!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className={`bg-gradient-to-r ${levelInfo.color} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{levelInfo.icon}</span>
              <div>
                <p className="text-sm opacity-90">Livello</p>
                <p className="font-bold text-lg">{levelInfo.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Punti</p>
              <p className="font-bold text-lg">{loyaltyProfile.points_balance}</p>
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {loyaltyProfile.monthly_orders_count} ordini questo mese
            </span>
            {benefits.deliveryDiscount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                -{benefits.deliveryDiscount}% consegna
              </Badge>
            )}
          </div>
          {benefits.ordersToNextLevel && benefits.ordersToNextLevel > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Prossimo livello</span>
                <span>{benefits.ordersToNextLevel} ordini mancanti</span>
              </div>
              <Progress value={progressToNextLevel} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      {/* Header con gradiente */}
      <div className={`bg-gradient-to-r ${levelInfo.color} p-6 text-white relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{levelInfo.icon}</span>
              <div>
                <p className="text-sm opacity-90">Il tuo livello</p>
                <h2 className="text-2xl font-bold">{levelInfo.name}</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Punti totali</p>
              <p className="text-3xl font-bold">{loyaltyProfile.points_balance}</p>
              <p className="text-xs opacity-75">≈ €{pointsValue.toFixed(2)}</p>
            </div>
          </div>

          {/* Progress to next level */}
          {benefits.ordersToNextLevel && benefits.ordersToNextLevel > 0 && (
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso verso {level === 'bronze' ? 'Argento' : 'Oro'}</span>
                <span className="font-semibold">
                  {loyaltyProfile.monthly_orders_count}/{benefits.nextLevelThreshold} ordini
                </span>
              </div>
              <Progress value={progressToNextLevel} className="h-2 bg-white/30" />
              <p className="text-xs mt-1 opacity-90">
                {benefits.ordersToNextLevel} ordini per salire di livello
              </p>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Benefits */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            I tuoi vantaggi
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {levelInfo.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">{loyaltyProfile.monthly_orders_count}</p>
            <p className="text-xs text-muted-foreground">Ordini mensili</p>
          </div>
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">{loyaltyProfile.lifetime_points}</p>
            <p className="text-xs text-muted-foreground">Punti totali</p>
          </div>
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">{benefits.deliveryDiscount}%</p>
            <p className="text-xs text-muted-foreground">Sconto consegna</p>
          </div>
        </div>

        {/* Referral section */}
        <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Invita amici, guadagna €5!</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Condividi il tuo codice e ricevi €5 di sconto. I tuoi amici riceveranno €3 di benvenuto!
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border rounded-lg px-4 py-2 font-mono text-lg text-center">
              {loyaltyProfile.referral_code}
            </div>
            <Button variant="outline" onClick={copyReferralCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* CTA for next level - always show, clickable to loyalty page */}
        <div 
          className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={() => navigate("/fedelta")}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="font-medium">
                {benefits.ordersToNextLevel && benefits.ordersToNextLevel > 0 
                  ? "Sblocca più vantaggi!" 
                  : "Scopri tutti i vantaggi!"
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {benefits.ordersToNextLevel && benefits.ordersToNextLevel > 0 
                  ? `Ancora ${benefits.ordersToNextLevel} ordini per il prossimo livello`
                  : "Vedi tutti i livelli e i benefici"
                }
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
};
