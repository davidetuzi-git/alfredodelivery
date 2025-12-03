import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { UserSubmenu } from "@/components/UserSubmenu";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLoyalty, LOYALTY_LEVELS, LoyaltyLevel } from "@/hooks/useLoyalty";
import { ArrowLeft, Trophy, Gift, Sparkles, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const Loyalty = () => {
  const navigate = useNavigate();
  const { loyaltyProfile, transactions, loading, getPointsValue } = useLoyalty();

  const levelOrder: LoyaltyLevel[] = ['bronze', 'silver', 'gold', 'platinum'];

  const getPointsRangeText = (level: LoyaltyLevel) => {
    const info = LOYALTY_LEVELS[level];
    if (info.maxPoints === null) {
      return `${info.minPoints}+ punti`;
    }
    return `${info.minPoints}-${info.maxPoints} punti`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Programma Fedeltà</h1>
          <p className="text-muted-foreground">Accumula punti e sblocca vantaggi esclusivi</p>
        </div>

        {/* Main loyalty card */}
        <LoyaltyCard />

        {/* Level validity info */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Validità dei livelli</p>
                <p className="text-sm text-amber-700">
                  Ogni livello raggiunto ha una validità di <strong>12 mesi</strong>. 
                  Dopo questo periodo, se non vengono mantenuti i punti necessari, 
                  si torna al livello precedente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All levels comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Tutti i livelli
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {levelOrder.map((level) => {
              const info = LOYALTY_LEVELS[level];
              const isCurrentLevel = loyaltyProfile?.current_level === level;
              
              return (
                <div
                  key={level}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentLevel 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{info.icon}</span>
                      <span className="font-semibold">{info.name}</span>
                      {isCurrentLevel && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Attuale
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {getPointsRangeText(level)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {info.benefits.map((benefit, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs bg-muted px-2 py-1 rounded-full"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Points history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Storico punti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna transazione punti ancora.</p>
                <p className="text-sm">Effettua il tuo primo ordine per iniziare!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{tx.description || tx.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                    <span className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral info */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Invita un amico</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Per ogni amico che si registra con il tuo codice:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    Tu ricevi <strong>€5 di sconto</strong> sul prossimo ordine
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    Il tuo amico riceve <strong>€3 di benvenuto</strong>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Navigation />
    </div>
  );
};

export default Loyalty;
