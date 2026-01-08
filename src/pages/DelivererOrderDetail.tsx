import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Store, User, Phone, Package, CheckCircle2, Navigation, List, LayoutGrid, XCircle, RefreshCw, AlertTriangle, MessageSquare, ShoppingBag, Camera, Upload, Loader2, Receipt } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderChat from "@/components/OrderChat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  checked?: boolean;
  notFound?: boolean;
  alternative?: string;
  waitingApproval?: boolean;
  approvedAlternative?: boolean;
  isEstimated?: boolean;
}

interface Order {
  id: string;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  store_name: string;
  delivery_date: string;
  time_slot: string;
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  delivery_status: string;
  created_at: string;
  user_id: string;
}

// Mapping prodotti -> reparti supermercato
const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  'Frutta e Verdura': ['mela', 'banana', 'arancia', 'limone', 'pomodoro', 'insalata', 'lattuga', 'carota', 'patata', 'cipolla', 'aglio', 'zucchina', 'melanzana', 'peperone', 'frutta', 'verdura', 'kiwi', 'pera', 'uva', 'fragola', 'cetriolo', 'spinaci', 'broccoli', 'cavolfiore', 'cavolo', 'sedano', 'finocchio', 'rucola', 'radicchio', 'carciofi', 'asparagi', 'funghi', 'avocado', 'mango', 'ananas', 'cocco', 'melone', 'anguria', 'pesca', 'albicocca', 'ciliegia', 'fico', 'melagrana'],
  'Latticini e Formaggi': ['latte', 'yogurt', 'formaggio', 'mozzarella', 'parmigiano', 'grana', 'ricotta', 'burro', 'mascarpone', 'gorgonzola', 'pecorino', 'stracchino', 'philadelphia', 'crescenza', 'taleggio', 'fontina', 'provolone', 'scamorza', 'feta', 'emmental', 'brie', 'camembert', 'panna', 'besciamella'],
  'Carne e Salumi': ['carne', 'pollo', 'manzo', 'maiale', 'vitello', 'agnello', 'tacchino', 'salsiccia', 'hamburger', 'prosciutto', 'salame', 'mortadella', 'pancetta', 'speck', 'bresaola', 'wurstel', 'coppa', 'guanciale', 'bacon', 'cotechino', 'arrosto', 'bistecca', 'fettine', 'macinato', 'polpette'],
  'Pesce e Frutti di Mare': ['pesce', 'salmone', 'tonno', 'merluzzo', 'orata', 'branzino', 'sogliola', 'gamberi', 'calamari', 'cozze', 'vongole', 'polpo', 'seppia', 'acciughe', 'sardine', 'sgombro', 'trota', 'bastoncini', 'surimi', 'baccalà'],
  'Pane e Prodotti da Forno': ['pane', 'panino', 'focaccia', 'grissini', 'crackers', 'fette biscottate', 'piadina', 'pancarrè', 'brioche', 'cornetto', 'croissant', 'torta', 'biscotti', 'merendine', 'ciambella', 'plumcake', 'muffin'],
  'Pasta, Riso e Cereali': ['pasta', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'farfalle', 'lasagne', 'gnocchi', 'riso', 'farina', 'cereali', 'corn flakes', 'muesli', 'avena', 'orzo', 'farro', 'couscous', 'quinoa', 'polenta'],
  'Conserve e Condimenti': ['passata', 'pelati', 'sughi', 'olio', 'aceto', 'sale', 'pepe', 'spezie', 'maionese', 'ketchup', 'senape', 'pesto', 'olive', 'sottaceti', 'capperi', 'tonno in scatola', 'legumi in scatola', 'fagioli', 'ceci', 'lenticchie', 'mais', 'piselli'],
  'Surgelati': ['surgelato', 'gelato', 'pizza surgelata', 'verdure surgelate', 'pesce surgelato', 'patatine surgelate', 'ghiaccioli', 'semifreddo', 'frozen'],
  'Bevande': ['acqua', 'succo', 'coca cola', 'fanta', 'sprite', 'aranciata', 'tè', 'birra', 'vino', 'prosecco', 'spumante', 'liquore', 'energy drink', 'redbull', 'limonata', 'gassosa', 'chinotto', 'cedrata', 'aperitivo', 'caffè in bottiglia'],
  'Colazione e Caffè': ['caffè', 'cappuccino', 'cacao', 'nutella', 'marmellata', 'miele', 'crema spalmabile', 'biscotti', 'fette biscottate', 'corn flakes', 'muesli', 'nescafé', 'orzo solubile', 'tè', 'tisana', 'camomilla'],
  'Snack e Dolci': ['cioccolato', 'cioccolatini', 'caramelle', 'patatine', 'chips', 'taralli', 'salatini', 'popcorn', 'snack', 'barrette', 'kinder', 'ferrero', 'pocket coffee', 'wafer'],
  'Igiene Personale': ['shampoo', 'bagnoschiuma', 'sapone', 'dentifricio', 'spazzolino', 'deodorante', 'crema', 'rasoio', 'assorbenti', 'pannolini', 'cotton fioc', 'fazzoletti', 'salviette', 'collutorio'],
  'Pulizia Casa': ['detersivo', 'ammorbidente', 'candeggina', 'sgrassatore', 'detergente', 'spugna', 'carta igienica', 'scottex', 'sacchetti', 'mocio', 'scope', 'guanti', 'alluminio', 'pellicola']
};

const categorizeToDepartment = (itemName: string): string => {
  const lowerName = itemName.toLowerCase();
  
  for (const [department, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return department;
      }
    }
  }
  return 'Altro';
};

const DEPARTMENT_ORDER = [
  'Frutta e Verdura',
  'Pane e Prodotti da Forno',
  'Latticini e Formaggi',
  'Carne e Salumi',
  'Pesce e Frutti di Mare',
  'Pasta, Riso e Cereali',
  'Conserve e Condimenti',
  'Surgelati',
  'Bevande',
  'Colazione e Caffè',
  'Snack e Dolci',
  'Igiene Personale',
  'Pulizia Casa',
  'Altro'
];

const DelivererOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [delivererName, setDelivererName] = useState<string>("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'smart'>('list');
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
  const [alternativeItemIndex, setAlternativeItemIndex] = useState<number | null>(null);
  const [alternativeText, setAlternativeText] = useState("");
  const [showForceCompleteDialog, setShowForceCompleteDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Raggruppa items per reparto
  const itemsByDepartment = useMemo(() => {
    const grouped: Record<string, { items: (OrderItem & { originalIndex: number })[]; checkedCount: number }> = {};
    
    items.forEach((item, index) => {
      const dept = categorizeToDepartment(item.name);
      if (!grouped[dept]) {
        grouped[dept] = { items: [], checkedCount: 0 };
      }
      grouped[dept].items.push({ ...item, originalIndex: index });
      if (item.checked || item.approvedAlternative || item.notFound) {
        grouped[dept].checkedCount++;
      }
    });

    // Ordina secondo DEPARTMENT_ORDER
    const orderedDepartments: typeof grouped = {};
    DEPARTMENT_ORDER.forEach(dept => {
      if (grouped[dept]) {
        orderedDepartments[dept] = grouped[dept];
      }
    });

    return orderedDepartments;
  }, [items]);

  useEffect(() => {
    loadOrderDetails();
    loadDelivererInfo();
  }, [orderId]);

  useEffect(() => {
    let watchId: number | null = null;

    if (sharingLocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Update deliverer position in database
            const { error } = await supabase
              .from('deliverers')
              .update({
                latitude,
                longitude
              })
              .eq('user_id', session.user.id);

            if (error) {
              console.error('Error updating position:', error);
            }
          } catch (error) {
            console.error('Error sharing location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error("Errore nell'accesso alla posizione");
          setSharingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [sharingLocation]);

  const loadDelivererInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('deliverers')
        .select('name')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setDelivererName(data.name);
      }
    } catch (error) {
      console.error('Error loading deliverer info:', error);
    }
  };

  const toggleLocationSharing = (fromPrompt: boolean = false) => {
    if (!sharingLocation) {
      if ('geolocation' in navigator) {
        setSharingLocation(true);
        toast.success("Condivisione posizione attivata");
        if (fromPrompt) {
          setShowLocationPrompt(false);
        }
      } else {
        toast.error("Geolocalizzazione non supportata");
      }
    } else {
      setSharingLocation(false);
      toast.success("Condivisione posizione disattivata");
    }
  };

  const loadOrderDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/deliverer-auth');
        return;
      }

      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (orderData) {
        // Initialize items with checked state first
        const itemsArray = Array.isArray(orderData.items) ? orderData.items : [];
        const itemsWithState = itemsArray.map((item: any) => ({
          name: item.name || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          checked: false,
          isEstimated: item.isEstimated || false
        }));
        setItems(itemsWithState);
        
        // Set order with properly typed items
        const orderWithItems: Order = {
          ...orderData,
          items: itemsWithState
        };
        
        setOrder(orderWithItems);
        
        // Check if receipt already uploaded
        if (orderData.receipt_url) {
          setReceiptUploaded(true);
        }
      }
    } catch (error: any) {
      console.error("Error loading order:", error);
      toast.error("Errore nel caricamento dell'ordine");
    } finally {
      setLoading(false);
    }
  };

  // Handle receipt file selection
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File troppo grande. Max 10MB");
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload receipt to storage
  const uploadReceipt = async (): Promise<boolean> => {
    if (!receiptFile || !orderId) return false;
    
    setUploadingReceipt(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${orderId}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('order-receipts')
        .upload(filePath, receiptFile);
      
      if (uploadError) throw uploadError;
      
      // Get public URL (signed for private bucket)
      const { data: urlData } = await supabase.storage
        .from('order-receipts')
        .createSignedUrl(filePath, 60 * 60 * 24 * 60); // 60 days validity
      
      // Update order with receipt URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          receipt_url: urlData?.signedUrl || filePath,
          receipt_uploaded_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      setReceiptUploaded(true);
      setShowReceiptDialog(false);
      toast.success("Scontrino caricato con successo!");
      return true;
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      toast.error("Errore nel caricamento dello scontrino");
      return false;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const toggleItemCheck = async (index: number) => {
    const currentCheckedCount = items.filter(item => item.checked).length;
    const newItems = items.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    );
    const newCheckedCount = newItems.filter(item => item.checked).length;
    
    setItems(newItems);

    try {
      // Se è il primo prodotto spuntato, aggiorna lo stato a "at_store"
      if (currentCheckedCount === 0 && newCheckedCount === 1 && order?.delivery_status === 'assigned') {
        const { error } = await supabase
          .from('orders')
          .update({ 
            delivery_status: 'at_store',
            status: 'at_store'
          })
          .eq('id', orderId);

        if (error) throw error;
        
        // Aggiorna l'ordine locale
        if (order) {
          setOrder({ ...order, delivery_status: 'at_store' });
        }
        
        // Create shopping_started notification for customer
        try {
          // Get customer profile to check for Telegram
          const { data: customerProfile } = await supabase
            .from("profiles")
            .select("telegram_chat_id")
            .eq("id", order.user_id)
            .single();

          const customerChannels = ["email"];
          if (customerProfile?.telegram_chat_id) {
            customerChannels.push("telegram");
          }

          await supabase
            .from("scheduled_notifications")
            .insert({
              order_id: order.id,
              recipient_type: "customer",
              recipient_id: order.user_id,
              notification_type: "shopping_started",
              scheduled_for: new Date().toISOString(),
              channels: customerChannels,
            });
        } catch (notifError) {
          console.error("Error creating shopping_started notification:", notifError);
        }
        
        toast.success("Stato aggiornato: Arrivato al supermercato");
      }
      
      // Se tutti i prodotti sono spuntati, aggiorna lo stato a "shopping_complete"
      if (newCheckedCount === items.length && order?.delivery_status === 'at_store') {
        const { error } = await supabase
          .from('orders')
          .update({ 
            delivery_status: 'shopping_complete',
            status: 'shopping_complete'
          })
          .eq('id', orderId);

        if (error) throw error;
        
        // Aggiorna l'ordine locale
        if (order) {
          setOrder({ ...order, delivery_status: 'shopping_complete' });
        }
        
        toast.success("Stato aggiornato: Spesa completata");
        
        // Mostra popup per condivisione posizione se non è già attiva
        if (!sharingLocation) {
          setShowLocationPrompt(true);
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const handleCompleteOrder = async () => {
    // Check if receipt is uploaded
    if (!receiptUploaded) {
      setShowReceiptDialog(true);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_status: 'delivered',
          status: 'delivered'
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Ordine completato!");
      navigate('/deliverer-dashboard');
    } catch (error: any) {
      console.error("Error completing order:", error);
      toast.error("Errore nel completamento dell'ordine");
    }
  };

  const markItemNotFound = (index: number) => {
    const newItems = items.map((item, i) => 
      i === index ? { ...item, notFound: true, checked: false, alternative: undefined, waitingApproval: false } : item
    );
    setItems(newItems);
    
    // Invia messaggio automatico in chat
    sendChatMessage(`❌ Articolo non trovato: "${items[index].name}" (Qtà: ${items[index].quantity})`);
    toast.info(`Articolo segnalato come non trovato`);
  };

  const resetItemStatus = (index: number) => {
    const newItems = items.map((item, i) => 
      i === index ? { ...item, notFound: false, checked: false, alternative: undefined, waitingApproval: false, approvedAlternative: false } : item
    );
    setItems(newItems);
  };

  const openAlternativeDialog = (index: number) => {
    setAlternativeItemIndex(index);
    setAlternativeText("");
    setShowAlternativeDialog(true);
  };

  const submitAlternative = async () => {
    if (alternativeItemIndex === null || !alternativeText.trim()) return;
    
    const newItems = items.map((item, i) => 
      i === alternativeItemIndex ? { ...item, alternative: alternativeText, waitingApproval: true, notFound: false, checked: false } : item
    );
    setItems(newItems);
    
    // Invia messaggio in chat per richiedere autorizzazione
    await sendChatMessage(`🔄 RICHIESTA AUTORIZZAZIONE:\nArticolo: "${items[alternativeItemIndex].name}"\nAlternativa proposta: "${alternativeText}"\n\n👉 Rispondi "OK" o "SI" per confermare, oppure "NO" per rifiutare.`);
    
    toast.success("Richiesta alternativa inviata al cliente");
    setShowAlternativeDialog(false);
    setAlternativeItemIndex(null);
    setAlternativeText("");
  };

  const sendChatMessage = async (message: string) => {
    try {
      await supabase
        .from('order_chat_messages')
        .insert({
          order_id: orderId,
          sender_type: 'deliverer',
          sender_name: delivererName || 'Fattorino',
          message
        });
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  };

  const handleForceCompleteShopping = async () => {
    // Aggiorna stato a shopping_complete anche con articoli mancanti
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_status: 'shopping_complete',
          status: 'shopping_complete'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      if (order) {
        setOrder({ ...order, delivery_status: 'shopping_complete' });
      }
      
      // Invia riepilogo articoli mancanti
      const missingItems = items.filter(i => i.notFound);
      if (missingItems.length > 0) {
        const missingList = missingItems.map(i => `- ${i.name} (Qtà: ${i.quantity})`).join('\n');
        await sendChatMessage(`⚠️ SPESA COMPLETATA CON ARTICOLI MANCANTI:\n${missingList}\n\nIl totale sarà ricalcolato alla consegna.`);
      }
      
      toast.success("Spesa chiusa");
      setShowForceCompleteDialog(false);
      
      if (!sharingLocation) {
        setShowLocationPrompt(true);
      }
    } catch (error) {
      console.error('Error force completing shopping:', error);
      toast.error("Errore nel completamento della spesa");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ordine non trovato</p>
      </div>
    );
  }

  const checkedCount = items.filter(item => item.checked || item.approvedAlternative).length;
  const notFoundCount = items.filter(item => item.notFound).length;
  const waitingApprovalCount = items.filter(item => item.waitingApproval).length;
  const totalItems = items.length;
  const processedItems = checkedCount + notFoundCount;
  const allProcessed = processedItems === totalItems && waitingApprovalCount === 0;
  const canForceComplete = checkedCount > 0 && (notFoundCount > 0 || waitingApprovalCount > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate('/deliverer-dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Dettagli Ordine</h1>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Codice Ritiro</CardTitle>
                <p className="text-3xl font-bold text-primary mt-2">{order.pickup_code}</p>
              </div>
              <Badge className="bg-blue-500">
                {order.delivery_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Ritiro da:</p>
                <p className="text-muted-foreground">{order.store_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Consegna a:</p>
                <p className="text-muted-foreground">{order.delivery_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Orario:</p>
                <p className="text-muted-foreground">
                  {new Date(order.delivery_date).toLocaleDateString('it-IT')} - {order.time_slot}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Cliente:</p>
                <p className="text-muted-foreground">{order.customer_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">Telefono:</p>
                <p className="text-muted-foreground">{order.customer_phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <CardTitle>Lista della Spesa</CardTitle>
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-2 justify-end">
                  <span className="text-green-600">{checkedCount} ✓</span>
                  {notFoundCount > 0 && <span className="text-red-600">{notFoundCount} ✗</span>}
                  {waitingApprovalCount > 0 && <span className="text-yellow-600">{waitingApprovalCount} ⏳</span>}
                  <span>/ {totalItems}</span>
                </div>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'smart')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Lista
                  </TabsTrigger>
                  <TabsTrigger value="smart" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Per Reparto
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'list' ? (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors ${
                      item.checked || item.approvedAlternative ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 
                      item.notFound ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                      item.waitingApproval ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
                      'bg-background'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`item-${index}`}
                        checked={item.checked || item.approvedAlternative}
                        disabled={item.notFound || item.waitingApproval}
                        onCheckedChange={() => toggleItemCheck(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className={item.checked || item.approvedAlternative ? 'line-through text-muted-foreground' : ''}>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">Quantità: {item.quantity}</p>
                            {item.isEstimated && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                                Prezzo stimato
                              </span>
                            )}
                            {item.alternative && (
                              <p className="text-sm text-orange-600 mt-1">
                                <RefreshCw className="inline h-3 w-3 mr-1" />
                                Alternativa: {item.alternative}
                              </p>
                            )}
                            {item.waitingApproval && (
                              <Badge variant="outline" className="mt-1 text-yellow-700 border-yellow-500 bg-yellow-100">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                In attesa approvazione cliente
                              </Badge>
                            )}
                            {item.notFound && (
                              <Badge variant="outline" className="mt-1 text-red-700 border-red-500 bg-red-100">
                                <XCircle className="h-3 w-3 mr-1" />
                                Non trovato
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
                            {item.isEstimated && (
                              <p className="text-xs text-orange-500">~stimato</p>
                            )}
                          </div>
                        </div>
                        
                        {!item.checked && !item.approvedAlternative && !item.notFound && !item.waitingApproval && (
                          <div className="flex gap-2 mt-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => markItemNotFound(index)}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Non trovato
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                              onClick={() => openAlternativeDialog(index)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Alternativa
                            </Button>
                          </div>
                        )}
                        
                        {(item.notFound || item.waitingApproval) && (
                          <div className="mt-2 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetItemStatus(index)}
                            >
                              Annulla
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(itemsByDepartment).map(([department, { items: deptItems, checkedCount: deptChecked }]) => (
                  <div key={department}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-primary flex items-center gap-2">
                        <span className="text-lg">🛒</span>
                        {department}
                      </h3>
                      <Badge variant={deptChecked === deptItems.length ? "default" : "outline"} className="text-xs">
                        {deptChecked}/{deptItems.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                      {deptItems.map((item) => (
                        <div
                          key={item.originalIndex}
                          className={`p-2 rounded-lg border transition-colors ${
                            item.checked || item.approvedAlternative ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 
                            item.notFound ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                            item.waitingApproval ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
                            'bg-background'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={`item-smart-${item.originalIndex}`}
                              checked={item.checked || item.approvedAlternative}
                              disabled={item.notFound || item.waitingApproval}
                              onCheckedChange={() => toggleItemCheck(item.originalIndex)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className={`flex justify-between items-start ${item.checked || item.approvedAlternative ? 'line-through text-muted-foreground' : ''}`}>
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">Qtà: {item.quantity}</p>
                                  {item.isEstimated && (
                                    <span className="text-xs text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                      Stimato
                                    </span>
                                  )}
                                  {item.alternative && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      <RefreshCw className="inline h-3 w-3 mr-1" />
                                      Alt: {item.alternative}
                                    </p>
                                  )}
                                  {item.waitingApproval && (
                                    <Badge variant="outline" className="mt-1 text-yellow-700 border-yellow-500 bg-yellow-100 text-xs">
                                      In attesa
                                    </Badge>
                                  )}
                                  {item.notFound && (
                                    <Badge variant="outline" className="mt-1 text-red-700 border-red-500 bg-red-100 text-xs">
                                      Non trovato
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm">€{(item.price * item.quantity).toFixed(2)}</p>
                                  {item.isEstimated && (
                                    <p className="text-xs text-orange-500">~</p>
                                  )}
                                </div>
                              </div>
                              
                              {!item.checked && !item.approvedAlternative && !item.notFound && !item.waitingApproval && (
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
                                    onClick={() => markItemNotFound(item.originalIndex)}
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-orange-600 hover:bg-orange-50"
                                    onClick={() => openAlternativeDialog(item.originalIndex)}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              
                              {(item.notFound || item.waitingApproval) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs mt-1"
                                  onClick={() => resetItemStatus(item.originalIndex)}
                                >
                                  Annulla
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Totale:</span>
                <span>€{order.total_amount.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground text-right">
                (Include €{order.delivery_fee.toFixed(2)} di consegna)
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4">
          <Button
            onClick={() => toggleLocationSharing(false)}
            variant={sharingLocation ? "default" : "outline"}
            className="w-full"
            size="lg"
          >
            <Navigation className={`h-5 w-5 mr-2 ${sharingLocation ? 'animate-pulse' : ''}`} />
            {sharingLocation ? 'Condivisione posizione attiva' : 'Condividi posizione con cliente'}
          </Button>
        </div>

        <div className="mb-4">
          <OrderChat
            orderId={order.id}
            customerName={order.customer_name}
            delivererName={delivererName}
            userType="deliverer"
          />
        </div>

        {/* Status summary */}
        {(notFoundCount > 0 || waitingApprovalCount > 0) && (
          <Card className="mb-4 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm">
                  {notFoundCount > 0 && (
                    <p className="text-orange-700">{notFoundCount} articol{notFoundCount > 1 ? 'i' : 'o'} non trovat{notFoundCount > 1 ? 'i' : 'o'}</p>
                  )}
                  {waitingApprovalCount > 0 && (
                    <p className="text-orange-700">{waitingApprovalCount} alternativ{waitingApprovalCount > 1 ? 'e' : 'a'} in attesa di approvazione</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Force complete button */}
        {canForceComplete && order.delivery_status !== 'shopping_complete' && (
          <Button
            onClick={() => setShowForceCompleteDialog(true)}
            variant="outline"
            className="w-full mb-4 border-orange-500 text-orange-600 hover:bg-orange-50"
            size="lg"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            Chiudi spesa con articoli mancanti
          </Button>
        )}

        {/* Receipt upload section */}
        {order.delivery_status === 'shopping_complete' && (
          <Card className={`mb-4 ${receiptUploaded ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-orange-300 bg-orange-50 dark:bg-orange-950/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className={`h-6 w-6 ${receiptUploaded ? 'text-green-600' : 'text-orange-600'}`} />
                  <div>
                    <p className="font-medium">
                      {receiptUploaded ? 'Scontrino caricato ✓' : 'Carica foto scontrino'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {receiptUploaded 
                        ? 'Conservato per 60 giorni' 
                        : 'Obbligatorio prima della consegna'}
                    </p>
                  </div>
                </div>
                {!receiptUploaded && (
                  <Button 
                    onClick={() => setShowReceiptDialog(true)}
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-100"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Carica
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleCompleteOrder}
          disabled={!allProcessed || order.delivery_status !== 'shopping_complete'}
          className="w-full"
          size="lg"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {order.delivery_status === 'shopping_complete' 
            ? (receiptUploaded ? 'Completa Consegna' : 'Carica scontrino per completare')
            : allProcessed 
              ? 'Prima completa la spesa' 
              : `Processa tutti gli articoli (${processedItems}/${totalItems})`}
        </Button>

        {/* Alternative dialog */}
        <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                Proponi alternativa
              </DialogTitle>
              <DialogDescription>
                {alternativeItemIndex !== null && items[alternativeItemIndex] && (
                  <>
                    Articolo originale: <strong>{items[alternativeItemIndex].name}</strong>
                    <br />
                    Inserisci il prodotto alternativo trovato. Il cliente riceverà una richiesta di approvazione via chat.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Es: Marca X invece di Marca Y, stesso formato"
                value={alternativeText}
                onChange={(e) => setAlternativeText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAlternativeDialog(false)}>
                Annulla
              </Button>
              <Button onClick={submitAlternative} disabled={!alternativeText.trim()}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Invia richiesta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Force complete dialog */}
        <AlertDialog open={showForceCompleteDialog} onOpenChange={setShowForceCompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Chiudi spesa con articoli mancanti?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Stai per chiudere la spesa con i seguenti problemi:</p>
                {notFoundCount > 0 && (
                  <p className="text-red-600">• {notFoundCount} articol{notFoundCount > 1 ? 'i' : 'o'} non trovat{notFoundCount > 1 ? 'i' : 'o'}</p>
                )}
                {waitingApprovalCount > 0 && (
                  <p className="text-orange-600">• {waitingApprovalCount} alternativ{waitingApprovalCount > 1 ? 'e' : 'a'} in attesa</p>
                )}
                <p className="mt-2">Il cliente verrà avvisato via chat e il totale sarà ricalcolato alla consegna.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleForceCompleteShopping} className="bg-orange-600 hover:bg-orange-700">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Chiudi spesa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showLocationPrompt} onOpenChange={setShowLocationPrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                Condividi la tua posizione
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Hai completato la spesa! 🎉</p>
                <p>
                  Attiva ora la condivisione della posizione per permettere al cliente 
                  di seguire in tempo reale il tuo percorso di consegna.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowLocationPrompt(false)}>
                Non ora
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => toggleLocationSharing(true)}>
                <Navigation className="h-4 w-4 mr-2" />
                Attiva condivisione
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Receipt upload dialog */}
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Carica foto scontrino
              </DialogTitle>
              <DialogDescription>
                Scatta una foto dello scontrino completo. Assicurati che tutti i prodotti e il totale siano leggibili.
                <br />
                <span className="text-xs text-muted-foreground">Lo scontrino sarà conservato per 60 giorni.</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <input
                type="file"
                ref={receiptInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleReceiptSelect}
                className="hidden"
              />
              
              {receiptPreview ? (
                <div className="relative">
                  <img 
                    src={receiptPreview} 
                    alt="Anteprima scontrino" 
                    className="w-full max-h-80 object-contain rounded-lg border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptPreview(null);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => receiptInputRef.current?.click()}
                >
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Tocca per scattare foto</p>
                  <p className="text-sm text-muted-foreground">o seleziona dalla galleria</p>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                Annulla
              </Button>
              <Button 
                onClick={uploadReceipt} 
                disabled={!receiptFile || uploadingReceipt}
              >
                {uploadingReceipt ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Carica scontrino
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DelivererOrderDetail;
