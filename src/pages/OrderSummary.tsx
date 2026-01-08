import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft, ArrowRight, MapPin, Calendar, Clock, Store, Loader2, Crown, Tag, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  isEstimated?: boolean;
  originalName?: string;
  imageUrl?: string;
}

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
}

const OrderSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.orderData;
  const orderFormData = location.state?.orderFormData;
  
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [productWarnings, setProductWarnings] = useState<Record<string, string>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState("");

  // Product brand compatibility checker
  const checkProductCompatibility = (productName: string, storeName: string): string | null => {
    const product = productName.toLowerCase();
    const store = storeName.toLowerCase();
    
    // Known discount-exclusive brands
    const discountBrands = {
      'lidl': ['freeway', 'preferred selection', 'cien', 'w5', 'lupilu'],
      'eurospin': ['tre mulini', 'montebello', 'bio premium'],
      'md': ['md', 'tesori del gusto'],
      'penny': ['penny', 'bravo'],
      'aldi': ['aldi', 'cucina', 'trader joe'],
    };
    
    // Known supermarket-exclusive brands
    const supermarketBrands = {
      'esselunga': ['esselunga', 'fidel', 'smart'],
      'coop': ['coop', 'fior fiore', 'vivi verde'],
      'conad': ['conad', 'sapori&dintorni', 'verso natura'],
      'carrefour': ['carrefour', 'terre d\'italia'],
      'pam': ['pam', 'panorama'],
    };
    
    // Check if product contains exclusive brand
    for (const [discountStore, brands] of Object.entries(discountBrands)) {
      if (brands.some(brand => product.includes(brand))) {
        if (!store.includes(discountStore)) {
          return `⚠️ "${productName}" è un prodotto esclusivo ${discountStore.toUpperCase()}. Potrebbe non essere disponibile in questo negozio.`;
        }
      }
    }
    
    for (const [supermarket, brands] of Object.entries(supermarketBrands)) {
      if (brands.some(brand => product.includes(brand))) {
        if (!store.includes(supermarket)) {
          return `⚠️ "${productName}" è un prodotto esclusivo ${supermarket.toUpperCase()}. Potrebbe non essere disponibile in questo negozio.`;
        }
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (!orderData) {
      navigate("/ordina");
      return;
    }

    const items = orderData.items as OrderItem[];

    // Use images from order if available
    const newImages: Record<string, string> = {};
    const newLoading: Record<string, boolean> = {};
    
    items.forEach((item) => {
      if (item.imageUrl && item.imageUrl.startsWith('http')) {
        // Use the image URL from the order data (already generated in Order page)
        newImages[item.name] = item.imageUrl;
        newLoading[item.name] = false;
        console.log(`[OrderSummary] Image found for "${item.name}":`, item.imageUrl.substring(0, 50) + '...');
      } else {
        newLoading[item.name] = false; // No image available
        console.log(`[OrderSummary] No image for "${item.name}", imageUrl:`, item.imageUrl);
      }
    });
    
    setProductImages(newImages);
    setLoadingImages(newLoading);
    
    // Check product compatibility
    const warnings: Record<string, string> = {};
    items.forEach((item) => {
      const warning = checkProductCompatibility(item.name, orderData.store);
      if (warning) {
        warnings[item.name] = warning;
      }
    });
    setProductWarnings(warnings);
  }, [orderData, navigate]);

  if (!orderData) {
    return null;
  }

  const items = orderData.items as OrderItem[];
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = orderData.deliveryFee || 3.99;
  const deliveryDistance = orderData.deliveryDistance || 0;
  const serviceFee = orderData.serviceFee || 0;
  const supplements = orderData.supplements || { bagFee: 0, waterFee: 0, waterOnlyFee: 0, total: 0 };
  const schedulingAdjustment = orderData.schedulingAdjustment || { amount: 0, description: '', suggestionReason: null, suggestionDiscount: 0 };
  const holidaySurcharge = orderData.holidaySurcharge || 0;
  const subscriptionData = orderData.subscription || null;
  const discount = 4.99;
  
  // Calculate voucher discount
  const voucherDiscount = appliedVoucher 
    ? (appliedVoucher.discount_type === 'percentage' 
        ? (subtotal * appliedVoucher.discount_value / 100) 
        : appliedVoucher.discount_value)
    : 0;
  
  const total = subtotal + deliveryFee + serviceFee + supplements.total + schedulingAdjustment.amount + holidaySurcharge - discount - voucherDiscount;

  // Validate voucher
  const validateVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Inserisci un codice");
      return;
    }
    
    setVoucherLoading(true);
    setVoucherError("");
    
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.trim().toUpperCase())
        .eq('active', true)
        .single();
      
      if (error || !data) {
        setVoucherError("Codice non valido");
        setVoucherLoading(false);
        return;
      }
      
      // Check validity dates
      const now = new Date();
      if (new Date(data.valid_from) > now || new Date(data.valid_until) < now) {
        setVoucherError("Codice scaduto o non ancora valido");
        setVoucherLoading(false);
        return;
      }
      
      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setVoucherError("Codice esaurito");
        setVoucherLoading(false);
        return;
      }
      
      // Check minimum order amount
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        setVoucherError(`Ordine minimo €${data.min_order_amount.toFixed(2)}`);
        setVoucherLoading(false);
        return;
      }
      
      setAppliedVoucher({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount
      });
      setVoucherCode("");
      toast({ title: "Voucher applicato!", description: `Sconto di €${data.discount_type === 'percentage' ? (subtotal * data.discount_value / 100).toFixed(2) : data.discount_value.toFixed(2)}` });
    } catch (err) {
      setVoucherError("Errore nella verifica");
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError("");
  };

  const handleProceedToCheckout = () => {
    // Strip imageUrl from items to reduce payload size
    const lightOrderData = {
      ...orderData,
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isEstimated: item.isEstimated,
        originalName: item.originalName,
        // Exclude imageUrl to avoid quota/size issues
      }))
    };
    
    navigate("/checkout", {
      state: {
        total,
        itemCount: items.length,
        deliveryFee,
        discount,
        supplements,
        schedulingAdjustment,
        holidaySurcharge,
        serviceFee,
        subtotal,
        orderData: lightOrderData,
        orderFormData,
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: voucherDiscount,
        voucherId: appliedVoucher?.id || null
      }
    });
  };

  const handleGoBack = () => {
    navigate("/ordina", {
      state: { orderFormData }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={handleGoBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'ordine
          </Button>
          <h1 className="text-3xl font-bold mb-2">Riepilogo Ordine</h1>
          <p className="text-muted-foreground">Verifica i dettagli prima di procedere al pagamento</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Delivery Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Dettagli Consegna
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-semibold">{orderData.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefono</p>
                <p className="font-semibold">{orderData.phone}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Indirizzo</p>
                <p className="font-semibold">{orderData.address}</p>
              </div>
            </div>
            
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Supermercato</p>
                  <p className="font-semibold text-sm">{orderData.store}</p>
                </div>
              </div>
              
              {orderData.flexibleDelivery ? (
                <div className="flex items-center gap-2 md:col-span-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data di Consegna</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                        🎯 Lascia decidere ad Alfredo
                      </p>
                      <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs">
                        -€5,00
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consegna entro 7 giorni, notifica 24h prima
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data di Consegna</p>
                      <p className="font-semibold text-sm">
                        {orderData.deliveryDate 
                          ? format(new Date(orderData.deliveryDate), "PPP", { locale: it })
                          : "Da definire"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Orario</p>
                      <p className="font-semibold text-sm">{orderData.timeSlot || "Da definire"}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Flexible delivery conditions */}
            {orderData.flexibleDelivery && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  📋 Condizioni consegna flessibile:
                </p>
                <ul className="text-xs text-green-600 dark:text-green-400 space-y-1 list-disc list-inside">
                  <li>Consegna garantita entro 7 giorni dalla richiesta</li>
                  <li>Notifica almeno 24 ore prima della consegna</li>
                  <li>Possibilità di rifiuto: 1 volta (riprogrammazione entro 4 giorni)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Prodotti ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                {/* Product Image */}
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {loadingImages[item.name] ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : productImages[item.name] ? (
                    <img 
                      src={productImages[item.name]} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">📦</div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg leading-tight">
                      {item.name}
                    </h3>
                    {item.originalName && item.originalName !== item.name && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Originale: {item.originalName}
                      </p>
                    )}
                    {item.isEstimated && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                        Prezzo stimato
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm text-muted-foreground">
                      Quantità: <span className="font-semibold text-foreground">{item.quantity}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        €{item.price.toFixed(2)} cad.
                      </div>
                      <div className="text-lg font-bold text-primary">
                        €{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Product compatibility warning */}
                  {productWarnings[item.name] && (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        {productWarnings[item.name]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Price Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Riepilogo Costi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Subscription Banner */}
            {subscriptionData && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg mb-4">
                <Crown className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Alfredo Extra {subscriptionData.plan === "yearly" ? "Plus" : "Base"}</p>
                  <p className="text-xs text-muted-foreground">
                    {subscriptionData.usedDelivery 
                      ? `Consegna gratuita inclusa • ${subscriptionData.deliveriesRemaining} rimanenti dopo questo ordine`
                      : `Product picking a €${subscriptionData.pickingFee.toFixed(2)}/prodotto`
                    }
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0">Attivo</Badge>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotale</span>
              <span className="font-semibold">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Costo consegna
                {deliveryDistance > 0 && (
                  <span className="ml-1 text-xs">({deliveryDistance.toFixed(1)} km)</span>
                )}
              </span>
              {subscriptionData?.usedDelivery ? (
                <span className="font-semibold text-green-600">
                  <span className="line-through text-muted-foreground mr-2">€{(deliveryDistance <= 7 ? (subtotal < 50 ? 10 : 8) : (deliveryDistance <= 10 ? (subtotal < 50 ? 15 : 12) : 20)).toFixed(2)}</span>
                  GRATIS
                </span>
              ) : (
                <span className="font-semibold">€{deliveryFee.toFixed(2)}</span>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Costo del servizio
                {subscriptionData && (
                  <span className="ml-1 text-xs text-primary">(€{subscriptionData.pickingFee}/prodotto)</span>
                )}
              </span>
              <span className="font-semibold">€{serviceFee.toFixed(2)}</span>
            </div>
            {supplements.total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Supplementi</span>
                <span className="font-semibold">€{supplements.total.toFixed(2)}</span>
              </div>
            )}
            {schedulingAdjustment.amount !== 0 && (
              <div className={`flex justify-between text-sm ${
                schedulingAdjustment.amount > 0 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-green-600 dark:text-green-400"
              }`}>
                <div className="flex flex-col">
                  <span>{schedulingAdjustment.amount > 0 ? "Supplemento urgenza" : "Sconto programmazione"}</span>
                  {schedulingAdjustment.description && (
                    <span className="text-xs opacity-80">{schedulingAdjustment.description}</span>
                  )}
                  {schedulingAdjustment.suggestionReason && (
                    <span className="text-xs opacity-80">+ {schedulingAdjustment.suggestionReason}</span>
                  )}
                </div>
                <span className="font-semibold">
                  {schedulingAdjustment.amount > 0 ? '+' : ''}€{schedulingAdjustment.amount.toFixed(2)}
                </span>
              </div>
            )}
            {holidaySurcharge > 0 && (
              <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                <div className="flex flex-col">
                  <span>Supplemento festivo</span>
                  <span className="text-xs opacity-80">Consegna in giorno festivo</span>
                </div>
                <span className="font-semibold">+€{holidaySurcharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>Sconto primo ordine</span>
              <span className="font-semibold">-€{discount.toFixed(2)}</span>
            </div>
            
            {/* Voucher Section */}
            <div className="border-t pt-3 space-y-3">
              {appliedVoucher ? (
                <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <div>
                      <span className="font-medium">Voucher {appliedVoucher.code}</span>
                      <p className="text-xs opacity-80">
                        {appliedVoucher.discount_type === 'percentage' 
                          ? `${appliedVoucher.discount_value}% di sconto`
                          : `€${appliedVoucher.discount_value.toFixed(2)} di sconto`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">-€{voucherDiscount.toFixed(2)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={removeVoucher}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Inserisci codice sconto"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(e.target.value.toUpperCase());
                          setVoucherError("");
                        }}
                        className="pl-9 uppercase"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={validateVoucher}
                      disabled={voucherLoading}
                    >
                      {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Applica"}
                    </Button>
                  </div>
                  {voucherError && (
                    <p className="text-xs text-red-500">{voucherError}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Voucher discount line */}
            {appliedVoucher && voucherDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Sconto voucher</span>
                <span className="font-semibold">-€{voucherDiscount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Totale</span>
              <span className="text-primary">€{total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sticky bottom-20 md:static bg-background pt-2 pb-2 md:pb-0">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Modifica
          </Button>
          <Button 
            onClick={handleProceedToCheckout}
            className="w-full"
          >
            Procedi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default OrderSummary;
