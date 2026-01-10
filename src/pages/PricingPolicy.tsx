import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Truck, Package, Droplets, Clock, Gift, Trophy, 
  MapPin, ShoppingBag, Sparkles, Calendar, Users, AlertCircle, Wallet
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LOYALTY_LEVELS } from "@/hooks/useLoyalty";

const PricingPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Policy Prezzi ALFREDO</h1>
          <p className="text-muted-foreground">Trasparenza totale sui costi del servizio</p>
        </div>

        {/* Delivery Fees by Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Costi di Consegna per Zona
            </CardTitle>
            <CardDescription>
              La tariffa varia in base alla distanza dal supermercato selezionato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Zona</th>
                    <th className="text-left py-3 px-2">Distanza</th>
                    <th className="text-right py-3 px-2">Spesa &lt;€50</th>
                    <th className="text-right py-3 px-2">Spesa ≥€50</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Zona 1</Badge>
                    </td>
                    <td className="py-3 px-2">0 - 7 km</td>
                    <td className="py-3 px-2 text-right font-semibold">€10,00</td>
                    <td className="py-3 px-2 text-right font-semibold">€8,00</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Zona 2</Badge>
                    </td>
                    <td className="py-3 px-2">7 - 10 km</td>
                    <td className="py-3 px-2 text-right font-semibold">€15,00</td>
                    <td className="py-3 px-2 text-right font-semibold">€12,00</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-medium">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">Zona 3</Badge>
                    </td>
                    <td className="py-3 px-2">&gt;10 km</td>
                    <td className="py-3 px-2 text-right font-semibold" colSpan={2}>€20,00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Discounts */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Sconti Fedeltà sulla Consegna
            </CardTitle>
            <CardDescription>
              Più ordini fai, più risparmi! Gli sconti si applicano al costo base di consegna
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {(['bronze', 'silver', 'gold', 'platinum'] as const).map((level) => {
                const info = LOYALTY_LEVELS[level];
                return (
                  <div key={level} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div>
                        <p className="font-semibold">{info.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {info.maxPoints === null ? `${info.minPoints}+ punti` : `${info.minPoints}-${info.maxPoints} punti`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${info.deliveryDiscount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {info.deliveryDiscount > 0 ? `-${info.deliveryDiscount}%` : 'Nessuno'}
                      </p>
                      <p className="text-xs text-muted-foreground">sconto consegna</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm space-y-2">
              <p className="font-medium mb-1">📌 Come funziona:</p>
              <p className="text-muted-foreground">
                I livelli si raggiungono accumulando punti (1 punto = €1 speso). 
                Ogni livello ha <strong>validità 12 mesi</strong> dalla data di raggiungimento.
              </p>
              <p className="text-muted-foreground">
                Esempio: Livello Argento con consegna base €10 → Sconto 5% = <strong>€9,50</strong> finale
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Fee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Costo Preparazione Spesa (Picking)
            </CardTitle>
            <CardDescription>
              Tariffa per prodotto selezionato e preparato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Utente Standard</span>
                <span className="font-bold">€0,15/prodotto</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Abbonato Mensile</span>
                </div>
                <span className="font-bold text-primary">€0,12/prodotto</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Abbonato Annuale</span>
                </div>
                <span className="font-bold text-primary">€0,10/prodotto</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Minimum Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Ordine Minimo e Supplementi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Spesa minima</span>
                <span className="text-xl font-bold">€25,00</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Calcolo Buste</h4>
              <div className="text-sm text-muted-foreground space-y-2 mb-2">
                <p><strong>1 busta</strong> = 15 litri OPPURE 12 pezzi (si applica il limite raggiunto prima)</p>
                <p><strong>Cassa d'acqua</strong> (9-12L) = 1 busta a sé stante</p>
                <p className="pt-2">Prime 3 buste incluse. Oltre: <strong>€3,00/busta aggiuntiva</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Water/Beverages Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Regole per Acqua e Bevande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Ordine Misto (prodotti + bevande)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Primi 9L di acqua inclusi nel prezzo standard</li>
                <li>• Oltre 9L: <strong>€0,50/litro</strong> aggiuntivo</li>
              </ul>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Ordine Solo Bevande</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Minimo: <strong>12 litri</strong></li>
                <li>• Massimo: <strong>24 litri</strong></li>
                <li>• Costo fisso: <strong>€10,00</strong></li>
                <li>• Oltre 9L: <strong>+€0,20/litro</strong></li>
              </ul>
            </div>
            
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">📌 Esempio ordine solo bevande 18L:</p>
              <p className="text-muted-foreground">
                Base €10 + (18-9) × €0,20 = €10 + €1,80 = <strong>€11,80</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Programmazione Consegna
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <div>
                  <p className="font-medium">Consegna Same-Day</p>
                  <p className="text-xs text-muted-foreground">Oggi, meno di 4h dalla richiesta</p>
                </div>
                <span className="font-bold text-red-600">+€2,00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <div>
                  <p className="font-medium">Consegna Domani</p>
                  <p className="text-xs text-muted-foreground">Next-day delivery</p>
                </div>
                <span className="font-bold text-yellow-600">€0,00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div>
                  <p className="font-medium">Programmata (2+ giorni)</p>
                  <p className="text-xs text-muted-foreground">Pianifica in anticipo</p>
                </div>
                <span className="font-bold text-green-600">-€1,00</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 Bonus extra per consegne nella stessa zona/orario di altri ordini!
            </p>
          </CardContent>
        </Card>

        {/* Referral */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Programma Referral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg text-center">
                <Gift className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-bold text-xl text-primary">€5,00</p>
                <p className="text-sm text-muted-foreground">Per chi invita</p>
                <p className="text-xs mt-1">Sconto sul prossimo ordine</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-bold text-xl text-primary">€3,00</p>
                <p className="text-sm text-muted-foreground">Per chi si registra</p>
                <p className="text-xs mt-1">Bonus di benvenuto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Points System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Sistema Punti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Bronzo</span>
                <span className="font-medium">1 punto per €1 speso</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Argento</span>
                <span className="font-medium">1.5 punti per €1 speso</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Oro</span>
                <span className="font-medium">2 punti per €1 speso</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Platino</span>
                <span className="font-medium">3 punti per €1 speso</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">Conversione: 100 punti = €1,00 di sconto</p>
            </div>
          </CardContent>
        </Card>

        {/* Price Deviation and Credits Policy */}
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Variazioni di Prezzo e Crediti Spesa
            </CardTitle>
            <CardDescription>
              Trasparenza sulle possibili differenze tra prezzi stimati e reali
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-orange-200">
              <h4 className="font-semibold mb-2 text-orange-700 dark:text-orange-400">⚠️ Avviso Importante sui Prezzi</h4>
              <p className="text-sm text-muted-foreground mb-3">
                I prezzi mostrati durante la preparazione della lista spesa sono <strong>stime</strong> basate su dati 
                storici e potrebbero differire dai prezzi effettivi al momento dell'acquisto. Le promozioni in corso 
                presso il supermercato <strong>non sono incluse</strong> nelle stime.
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
              <h4 className="font-semibold mb-2 text-green-700 dark:text-green-400 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Garanzia ALFREDO sui Prezzi
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• ALFREDO si assume la <strong>responsabilità</strong> per eventuali incrementi di prezzo rispetto al preventivo confermato.</li>
                <li>• In caso di discrepanza in favore del cliente, la differenza verrà <strong>rimborsata sotto forma di credito</strong> per spese successive.</li>
                <li>• I crediti sono utilizzabili per qualsiasi ordine futuro e vengono applicati automaticamente al checkout.</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
              <h4 className="font-semibold mb-2 text-amber-700 dark:text-amber-400">📅 Validità dei Crediti</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• I crediti spesa hanno validità di <strong>365 giorni</strong> dalla data di erogazione.</li>
                <li>• Riceverai una <strong>email di promemoria</strong> 30 giorni prima della scadenza.</li>
                <li>• I crediti non utilizzati entro la scadenza <strong>non saranno recuperabili</strong>.</li>
                <li>• Puoi verificare il saldo crediti e le relative scadenze nella sezione <strong>"I miei crediti"</strong> del tuo profilo.</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">💳 Come Utilizzare i Crediti</h4>
              <p className="text-sm text-muted-foreground">
                Durante il checkout, se hai crediti disponibili, comparirà il pulsante <strong>"Usa crediti spesa"</strong>. 
                Premendolo, il sistema utilizzerà automaticamente i crediti in ordine di scadenza (FIFO). L'eventuale 
                importo residuo sarà addebitato con il metodo di pagamento scelto.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Ultimo aggiornamento: Gennaio 2026</p>
          <p>Prezzi IVA inclusa. ALFREDO si riserva il diritto di modificare le tariffe.</p>
        </div>

        <Button onClick={() => navigate("/fedelta")} className="w-full" size="lg">
          <Trophy className="h-4 w-4 mr-2" />
          Vai al Programma Fedeltà
        </Button>
      </div>

      <Navigation />
    </div>
  );
};

export default PricingPolicy;
