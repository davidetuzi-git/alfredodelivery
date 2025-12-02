import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { Plus, X, Loader2, Trash2, ArrowLeft, ShoppingBag, AlertCircle, Receipt, FileText, Upload } from "lucide-react";
import SupermarketMap, { stores, calculateDistance } from "@/components/SupermarketMap";
import PriceComparison from "@/components/PriceComparison";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Session } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DeliveryDatePicker from "@/components/DeliveryDatePicker";
import { useSchedulingPricing, calculateSchedulingAdjustment } from "@/hooks/useSchedulingPricing";
import { useSubscription, SUBSCRIPTION_PLANS } from "@/hooks/useSubscription";
import { isSameDay } from "date-fns";

interface ShoppingItem {
  name: string;
  price: number | null;
  loading: boolean;
  quantity: number;
  suggestion: string | null;
  completedName?: string;
  productAvailable?: boolean;
  suggestedAlternative?: string | null;
  isEstimated?: boolean;
  estimateConfidence?: string;
  estimateReasoning?: string;
  originalName?: string;
  imageUrl?: string;
}

const Order = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const savedState = location.state?.orderFormData;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Autenticazione richiesta",
          description: "Devi effettuare l'accesso per fare un ordine",
          variant: "destructive",
        });
        navigate("/auth", { state: { returnTo: "/order" } });
        return;
      }
      
      setSession(session);
      
      // Load user profile data to prefill form fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, address, city, postal_code, preferred_store')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        // Pre-fill name if not already set
        if (!savedState?.name && profile.first_name && profile.last_name) {
          setName(`${profile.first_name} ${profile.last_name}`);
        }
        
        // Pre-fill phone if not already set
        if (!savedState?.phone && profile.phone) {
          setPhone(profile.phone);
        }
        
        // Pre-fill address if not already set
        if (!savedState?.address && profile.address) {
          const fullAddress = `${profile.address}${profile.city ? ', ' + profile.city : ''}${profile.postal_code ? ', ' + profile.postal_code : ''}`;
          setAddress(fullAddress);
        }
        
        // Pre-fill preferred store if not already set
        if (!savedState?.store && profile.preferred_store) {
          setStore(profile.preferred_store);
          // Also set the coordinates for the preferred store
          const selectedStore = stores.find(s => `${s.name} - ${s.address}` === profile.preferred_store);
          if (selectedStore) {
            setSelectedStoreCoords({ lat: selectedStore.lat, lng: selectedStore.lng });
          }
        }
      }
      
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth", { state: { returnTo: "/order" } });
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);
  
  // Try to restore from sessionStorage if no state was passed
  const getInitialState = () => {
    if (savedState) return savedState;
    
    const stored = sessionStorage.getItem('orderFormData');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  
  const initialState = getInitialState();
  
  const [name, setName] = useState(initialState?.name || "");
  const [phone, setPhone] = useState(initialState?.phone || "");
  const [address, setAddress] = useState(initialState?.address || "");
  const [streetNumber, setStreetNumber] = useState(initialState?.streetNumber || "");
  const [addressNotes, setAddressNotes] = useState(initialState?.addressNotes || "");
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lon: number } | null>(initialState?.addressCoords || null);
  const [store, setStore] = useState(initialState?.store || "");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(initialState?.deliveryDate ? new Date(initialState.deliveryDate) : undefined);
  const [timeSlot, setTimeSlot] = useState(initialState?.timeSlot || "");
  const [items, setItems] = useState<ShoppingItem[]>(initialState?.items || [{ name: "", price: null, loading: false, quantity: 1, suggestion: null }]);
  const [filteredStores, setFilteredStores] = useState<string[]>(initialState?.filteredStores || []);
  const [selectedStoreCoords, setSelectedStoreCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  // Use scheduling pricing hook for smart date suggestions
  const { suggestedDates } = useSchedulingPricing(
    store,
    addressCoords?.lat || null,
    addressCoords?.lon || null
  );

  // Calculate scheduling adjustment for current date selection
  const schedulingAdjustment = calculateSchedulingAdjustment(deliveryDate);
  
  // Check if selected date has extra discount from nearby orders
  const selectedSuggestion = deliveryDate 
    ? suggestedDates.find(s => isSameDay(s.date, deliveryDate))
    : null;
  
  // Total scheduling discount/surcharge
  const schedulingAmount = (schedulingAdjustment?.amount || 0) + (selectedSuggestion ? -selectedSuggestion.extraDiscount : 0);

  // Set store coordinates when component loads if store is already selected
  useEffect(() => {
    if (store && !selectedStoreCoords) {
      const selectedStore = stores.find(s => `${s.name} - ${s.address}` === store);
      if (selectedStore) {
        setSelectedStoreCoords({ lat: selectedStore.lat, lng: selectedStore.lng });
        console.log('Store coordinates set on load:', selectedStore);
      }
    }
  }, [store]);

  const [storeVoucherInfo, setStoreVoucherInfo] = useState<{
    accepts: boolean;
    types: string[];
  } | null>(null);

  // Get subscription benefits
  const { subscription, benefits: subscriptionBenefits, decrementDelivery } = useSubscription();

  // Calculate delivery fee based on distance and subtotal
  // If user has subscription with remaining deliveries, delivery is FREE
  const calculateDeliveryFee = (distance: number, subtotal: number, useSubscriptionDelivery: boolean = false): number => {
    if (useSubscriptionDelivery && subscriptionBenefits.deliveriesRemaining > 0) {
      return 0; // Free delivery for subscribers with remaining deliveries
    }
    
    if (distance <= 7) {
      return subtotal < 50 ? 10 : 8;
    } else if (distance <= 10) {
      return subtotal < 50 ? 15 : 12;
    }
    // Over 10km - could set a very high fee or not deliver
    return 20; // High fee for >10km deliveries
  };

  // Calculate service fee (product picking): €0.15 default, €0.12 monthly sub, €0.10 yearly sub
  const calculateServiceFee = (items: ShoppingItem[]): number => {
    const pickingFee = subscriptionBenefits.pickingFeePerProduct;
    return items.reduce((sum, item) => sum + (item.quantity * pickingFee), 0);
  };

  const storesFullList = [
    "Esselunga - Via Tuscolana 123, Roma",
    "Carrefour Express - Via Appia Nuova 45, Roma",
    "Coop - Via dei Castani 67, Roma",
    "Conad - Viale Manzoni 89, Roma",
    "Lidl - Via Casilina 234, Roma",
    "Esselunga - Viale Piave 10, Milano",
    "Carrefour - Via Lorenteggio 251, Milano",
    "Coop - Via Famagosta 75, Milano",
    "Pam - Corso Buenos Aires 33, Milano",
    "Iper - Via Rubattino 84, Milano",
    "Carrefour - Via Livorno 60, Torino",
    "Esselunga - Corso Sebastopoli 150, Torino",
    "Coop - Via Nizza 262, Torino",
    "Carrefour - Via Argine 380, Napoli",
    "Esselunga - Via Pisana 130, Firenze",
    "Conad - Via Emilia Ponente 74, Bologna",
  ];

  // Update stores list when map updates
  const handleStoresUpdate = (newStores: Array<{name: string; address: string; lat: number; lng: number}>) => {
    const storeStrings = newStores.map(s => `${s.name} - ${s.address}`);
    setFilteredStores(storeStrings);
  };

  // Auto-save form data to sessionStorage whenever it changes
  useEffect(() => {
    const formData = {
      name,
      phone,
      address,
      streetNumber,
      addressNotes,
      addressCoords,
      store,
      deliveryDate: deliveryDate?.toISOString(),
      timeSlot,
      items,
      filteredStores
    };
    
    sessionStorage.setItem('orderFormData', JSON.stringify(formData));
  }, [name, phone, address, streetNumber, addressNotes, addressCoords, store, deliveryDate, timeSlot, items, filteredStores]);

  const timeSlots = [
    "9:00 - 11:00",
    "11:00 - 13:00",
    "15:00 - 17:00",
    "17:00 - 19:00"
  ];

  const addItem = () => {
    setItems([...items, { name: "", price: null, loading: false, quantity: 1, suggestion: null }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleImportList = async () => {
    let textToImport = importText;

    // If a file was selected, read its content
    if (importFile) {
      try {
        const fileText = await importFile.text();
        textToImport = fileText;
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile leggere il file",
          variant: "destructive",
        });
        return;
      }
    }

    if (!textToImport.trim()) {
      toast({
        title: "Lista vuota",
        description: "Inserisci o carica una lista della spesa",
        variant: "destructive",
      });
      return;
    }

    // Parse the text - split by newlines and filter empty lines
    const lines = textToImport
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      toast({
        title: "Lista vuota",
        description: "Non sono stati trovati prodotti nella lista",
        variant: "destructive",
      });
      return;
    }

    // Convert lines to shopping items
    const newItems: ShoppingItem[] = lines.map(line => {
      // Try to extract quantity if format is like "2x latte" or "3 pane"
      const qtyMatch = line.match(/^(\d+)\s*[x×]\s*(.+)$/i) || line.match(/^(\d+)\s+(.+)$/);
      
      if (qtyMatch) {
        const quantity = parseInt(qtyMatch[1]);
        const name = qtyMatch[2].trim();
        return {
          name,
          price: null,
          loading: false,
          quantity: quantity > 0 ? quantity : 1,
          suggestion: null,
        };
      }

      return {
        name: line,
        price: null,
        loading: false,
        quantity: 1,
        suggestion: null,
      };
    });

    // Replace current items with imported ones
    setItems(newItems);

    // Fetch prices for all items
    newItems.forEach((item, index) => {
      if (item.name.trim()) {
        fetchPrice(index, item.name);
      }
    });

    // Close dialog and reset
    setShowImportDialog(false);
    setImportText("");
    setImportFile(null);

    toast({
      title: "Lista importata",
      description: `${newItems.length} ${newItems.length === 1 ? 'prodotto aggiunto' : 'prodotti aggiunti'}`,
    });
  };

  const updateItemName = (index: number, name: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name, suggestion: null };
    setItems(newItems);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], quantity: Math.max(1, quantity) };
    setItems(newItems);
  };


  const fetchPrice = async (index: number, productName: string) => {
    if (!productName.trim() || !store) return;

    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], loading: true };
      return newItems;
    });

    try {
      const { data, error } = await supabase.functions.invoke('search-product-price', {
        body: { 
          product: productName.trim(),
          storeName: store 
        }
      });

      if (!error && data?.price !== undefined) {
        console.log('📦 Dati ricevuti dalla funzione:', data);
        
        setItems(prevItems => {
          const updatedItems = [...prevItems];
          const updateData: any = { 
            price: data.price, 
            loading: false,
            imageUrl: data.imageUrl || null,
            isEstimated: data.estimated || false,
            productAvailable: data.productAvailable !== false,
            suggestedAlternative: data.suggestedAlternative || null
          };
          
          // If product was completed by AI, show it (always, even if similar to original)
          if (data.completedProduct && data.completedProduct.trim().length > 0) {
            updateData.completedName = data.completedProduct;
            console.log('✓ Nome completato salvato:', data.completedProduct);
          } else {
            console.log('⚠️ Nessun nome completato ricevuto');
          }
          
          // If product is not available, show warning
          if (data.productAvailable === false && data.suggestedAlternative) {
            updateData.suggestion = `⚠️ Prodotto non disponibile. Alternativa: ${data.suggestedAlternative}`;
          }
          
          console.log('💾 Update data finale:', updateData);
          updatedItems[index] = { ...updatedItems[index], ...updateData };
          return updatedItems;
        });
      } else if (data?.error || error) {
        // Price not found or error occurred
        const errorMessage = data?.error || data?.message || 'Impossibile recuperare il prezzo';
        
        setItems(prevItems => {
          const updatedItems = [...prevItems];
          updatedItems[index] = { 
            ...updatedItems[index], 
            loading: false, 
            suggestion: errorMessage,
            price: null
          };
          return updatedItems;
        });
        
        toast({
          title: "Prezzo non trovato",
          description: data?.message || errorMessage,
          variant: "destructive",
        });
      } else {
        setItems(prevItems => {
          const updatedItems = [...prevItems];
          updatedItems[index] = { ...updatedItems[index], loading: false, suggestion: null };
          return updatedItems;
        });
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      setItems(prevItems => {
        const updatedItems = [...prevItems];
        updatedItems[index] = { ...updatedItems[index], loading: false };
        return updatedItems;
      });
    }
  };

  // Calculate bags needed - max 20 products per bag, considering volume
  const calculateBags = () => {
    const validItems = items.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) return 0;
    
    let estimatedVolume = 0; // in liters
    let productCount = 0;
    
    validItems.forEach(item => {
      const itemName = item.name.toLowerCase();
      const qty = item.quantity;
      productCount += qty;
      
      // Volume estimates per product type (in liters)
      if (itemName.includes('acqua') || itemName.includes('water')) {
        // Water bottles - extract volume from name
        const match = itemName.match(/(\d+(?:\.\d+)?)\s*l/i);
        if (match) {
          estimatedVolume += parseFloat(match[1]) * qty;
        } else {
          estimatedVolume += 1.5 * qty; // Default 1.5L if not specified
        }
      } else if (itemName.includes('latte') || itemName.includes('milk') || itemName.includes('succo') || itemName.includes('juice')) {
        estimatedVolume += 1 * qty; // ~1L per bottle
      } else if (itemName.includes('olio') || itemName.includes('oil') || itemName.includes('vino') || itemName.includes('wine')) {
        estimatedVolume += 0.75 * qty; // ~750ml per bottle
      } else if (itemName.includes('pasta') || itemName.includes('riso') || itemName.includes('rice') || itemName.includes('farina') || itemName.includes('flour')) {
        estimatedVolume += 0.5 * qty; // ~500g packages
      } else if (itemName.includes('scatola') || itemName.includes('lattina') || itemName.includes('can')) {
        estimatedVolume += 0.4 * qty; // Canned goods
      } else {
        // Generic items: estimate ~0.8L per item (average grocery product)
        estimatedVolume += 0.8 * qty;
      }
    });
    
    // Calculate bags needed based on:
    // 1. Product count: max 20 products per bag
    // 2. Volume: max 15L per bag (realistic capacity)
    const bagsByCount = Math.ceil(productCount / 20);
    const bagsByVolume = Math.ceil(estimatedVolume / 15);
    
    // Use the larger number (more restrictive constraint)
    const bagsNeeded = Math.max(bagsByCount, bagsByVolume);
    return Math.max(1, bagsNeeded); // At least 1 bag
  };

  // Calculate water volume in liters
  const calculateWaterVolume = () => {
    const waterItems = items.filter(item => 
      item.name.toLowerCase().includes('acqua') || 
      item.name.toLowerCase().includes('water')
    );
    // Estimate liters from item names (e.g., "acqua 1.5L" or "acqua 6x1.5L")
    let totalLiters = 0;
    waterItems.forEach(item => {
      const match = item.name.match(/(\d+(?:\.\d+)?)\s*l/i);
      if (match) {
        const liters = parseFloat(match[1]);
        totalLiters += liters * item.quantity;
      }
    });
    return totalLiters;
  };

  // Calculate supplements based on rules
  const calculateSupplements = () => {
    const bags = calculateBags();
    const waterLiters = calculateWaterVolume();
    const validItems = items.filter(item => item.name.trim() !== "");
    
    let supplements = {
      bagFee: 0,
      waterFee: 0,
      waterOnlyFee: 0,
      total: 0,
      drinksOnlyError: null as string | null
    };

    // Bag supplement: €3 for each bag over 3 (max 3 bags = 45L included)
    if (bags > 3) {
      supplements.bagFee = (bags - 3) * 3;
    }

    // Check if order is drinks-only (beverages only)
    const isDrinksOnly = validItems.length > 0 && validItems.every(item => 
      item.name.toLowerCase().includes('acqua') || 
      item.name.toLowerCase().includes('water') ||
      item.name.toLowerCase().includes('bevanda') ||
      item.name.toLowerCase().includes('bibita') ||
      item.name.toLowerCase().includes('succo') ||
      item.name.toLowerCase().includes('latte') ||
      item.name.toLowerCase().includes('birra') ||
      item.name.toLowerCase().includes('vino')
    );

    if (isDrinksOnly && waterLiters > 0) {
      // Drinks-only order: Min 12L, Max 24L
      // Extra fisso €10 + €0.20 ogni litro oltre il nono
      if (waterLiters < 12) {
        supplements.drinksOnlyError = `Ordine solo bevande: minimo 12L (attuale: ${waterLiters.toFixed(1)}L)`;
      } else if (waterLiters > 24) {
        supplements.drinksOnlyError = `Ordine solo bevande: massimo 24L (attuale: ${waterLiters.toFixed(1)}L)`;
      } else {
        supplements.waterOnlyFee = 10; // Base fee
        if (waterLiters > 9) {
          const excessLiters = waterLiters - 9;
          supplements.waterOnlyFee += excessLiters * 0.20; // €0.20 per liter over 9
        }
      }
    } else if (waterLiters > 0) {
      // Mixed order with water: €0.50 per liter over 9L (included in volume)
      const includedWater = 9;
      if (waterLiters > includedWater) {
        const excessLiters = waterLiters - includedWater;
        supplements.waterFee = excessLiters * 0.50; // €0.50 per liter
      }
    }

    supplements.total = supplements.bagFee + supplements.waterFee + supplements.waterOnlyFee;
    return supplements;
  };

  const total = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const bags = calculateBags();
  const waterLiters = calculateWaterVolume();
  const supplements = calculateSupplements();
  const finalTotal = total + supplements.total;
  const meetsMinimum = total >= 25;
  
  // Check if all items have prices
  const validItems = items.filter(item => item.name.trim() !== "");
  const allPricesLoaded = validItems.length > 0 && validItems.every(item => 
    item.price !== null && item.price !== undefined && !item.loading
  );
  const anyLoading = validItems.some(item => item.loading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.name.trim() !== "");
    const errors = new Set<string>();
    const errorMessages: string[] = [];
    
    // Validate each field
    if (!name.trim()) {
      errors.add('name');
      errorMessages.push('Nome e cognome');
    }
    if (!phone.trim()) {
      errors.add('phone');
      errorMessages.push('Telefono');
    }
    if (!address.trim()) {
      errors.add('address');
      errorMessages.push('Indirizzo di consegna');
    }
    if (!streetNumber.trim()) {
      errors.add('streetNumber');
      errorMessages.push('Numero civico');
    }
    if (!store) {
      errors.add('store');
      errorMessages.push('Supermercato');
    }
    if (!deliveryDate) {
      errors.add('deliveryDate');
      errorMessages.push('Data di consegna');
    }
    if (!timeSlot) {
      errors.add('timeSlot');
      errorMessages.push('Fascia oraria');
    }
    if (validItems.length === 0) {
      errors.add('items');
      errorMessages.push('Almeno un prodotto');
    }
    
    if (errors.size > 0) {
      setFieldErrors(errors);
      toast({
        title: "Campi mancanti",
        description: `Compila: ${errorMessages.join(', ')}`,
        variant: "destructive",
      });
      
      // Scroll to first error
      const firstError = Array.from(errors)[0];
      const element = document.getElementById(firstError);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }
    
    // Clear errors if validation passed
    setFieldErrors(new Set());

    // Check if there are items without prices (NOT FOUND)
    const itemsWithoutPrice = validItems.filter(item => item.price === null || item.price === undefined);
    const notFoundPercentage = (itemsWithoutPrice.length / validItems.length) * 100;
    
    console.log(`Items without price: ${itemsWithoutPrice.length}/${validItems.length} (${notFoundPercentage.toFixed(1)}%)`);
    
    // CRITICAL: If > 5% of items have no price, block order and notify admin
    if (notFoundPercentage > 5) {
      console.error(`BLOCKING ORDER: ${notFoundPercentage.toFixed(1)}% items without price (threshold: 5%)`);
      
      // Send urgent notification to admin
      try {
        await supabase.from('admin_notifications').insert({
          type: 'urgent_price_not_found',
          title: 'URGENTE: Troppi prezzi non trovati',
          message: `Ordine bloccato: ${itemsWithoutPrice.length}/${validItems.length} prodotti (${notFoundPercentage.toFixed(1)}%) senza prezzo presso ${store}`,
          data: {
            storeName: store,
            storeAddress: address,
            itemsWithoutPrice: itemsWithoutPrice.map(item => item.name),
            totalItems: validItems.length,
            percentage: notFoundPercentage,
            userId: session?.user?.id,
            userEmail: session?.user?.email
          },
          status: 'pending'
        });
        console.log('✓ Admin notification sent');
      } catch (notifyError) {
        console.error('Failed to notify admin:', notifyError);
      }
      
      toast({
        title: "Ordine non completabile",
        description: `Troppi prodotti senza prezzo (${itemsWithoutPrice.length}/${validItems.length}). Un amministratore è stato notificato e ti contatterà a breve.`,
        variant: "destructive",
      });
      
      return; // BLOCK ORDER
    }
    
    let finalItems = validItems;
    
    // If there are some items without price (but < 5%), try to estimate
    if (itemsWithoutPrice.length > 0) {
      toast({
        title: "Stima prezzi in corso...",
        description: "Sto stimando i prezzi mancanti con l'IA",
      });

      try {
        const { data, error } = await supabase.functions.invoke('estimate-missing-prices', {
          body: { 
            items: validItems,
            storeName: store 
          }
        });

        if (error) throw error;

        if (data?.estimatedItems) {
          finalItems = data.estimatedItems;
          
          const estimatedCount = finalItems.filter((item: ShoppingItem) => item.isEstimated).length;
          toast({
            title: "Prezzi stimati",
            description: `${estimatedCount} ${estimatedCount === 1 ? 'prezzo stimato' : 'prezzi stimati'} con l'IA (stima conservativa)`,
          });
        }
      } catch (error) {
        console.error('Error estimating prices:', error);
        toast({
          title: "Errore",
          description: "Impossibile stimare i prezzi. Riprova.",
          variant: "destructive",
        });
        return;
      }
    }

    // Calculate total from final items
    const calculatedTotal = finalItems.reduce((sum, item) => {
      const itemPrice = item.price || 0;
      return sum + (itemPrice * item.quantity);
    }, 0);
    
    // Check drinks-only order validity
    if (supplements.drinksOnlyError) {
      toast({
        title: "Ordine solo bevande non valido",
        description: supplements.drinksOnlyError,
        variant: "destructive",
      });
      return;
    }
    
    // Check minimum spend
    if (total < 25) {
      toast({
        title: "Spesa minima non raggiunta",
        description: "La spesa minima è di 25€. Aggiungi altri prodotti per continuare.",
        variant: "destructive",
      });
      return;
    }

    const fullAddress = `${address}, ${streetNumber}${addressNotes ? ` - ${addressNotes}` : ''}`;
    
    // Check if user can use subscription delivery
    const useSubscriptionDelivery = subscriptionBenefits.hasActiveSubscription && subscriptionBenefits.deliveriesRemaining > 0;
    
    // Calculate delivery fee based on distance and subtotal
    let deliveryFee = 10; // Default for Zona 1 (0-7km) with <50€ spend
    let deliveryDistance = 0;
    
    if (addressCoords && selectedStoreCoords) {
      deliveryDistance = calculateDistance(
        addressCoords.lat,
        addressCoords.lon,
        selectedStoreCoords.lat,
        selectedStoreCoords.lng
      );
      deliveryFee = calculateDeliveryFee(deliveryDistance, calculatedTotal, useSubscriptionDelivery);
    } else {
      // If we don't have coordinates, use default based on subtotal
      deliveryFee = useSubscriptionDelivery ? 0 : (calculatedTotal < 50 ? 10 : 8);
    }

    // Calculate service fee (uses subscription picking fee if available)
    const serviceFee = calculateServiceFee(finalItems);
    
    // Calculate scheduling adjustment (discount or surcharge based on delivery date)
    const schedulingAdjustmentForOrder = calculateSchedulingAdjustment(deliveryDate);
    const suggestionDiscount = suggestedDates.find(s => isSameDay(s.date, deliveryDate!));
    const totalSchedulingAdjustment = (schedulingAdjustmentForOrder?.amount || 0) + 
      (suggestionDiscount ? -suggestionDiscount.extraDiscount : 0);
    
    navigate("/riepilogo-ordine", { 
      state: { 
        orderData: {
          name,
          phone,
          address: fullAddress,
          store,
          deliveryDate: deliveryDate.toISOString(),
          timeSlot,
          items: finalItems.map(item => ({
            ...item,
            price: item.price || 0
          })),
          supplements: {
            bagFee: supplements.bagFee,
            waterFee: supplements.waterFee,
            waterOnlyFee: supplements.waterOnlyFee,
            total: supplements.total
          },
          deliveryFee,
          deliveryDistance,
          serviceFee,
          schedulingAdjustment: {
            amount: totalSchedulingAdjustment,
            description: schedulingAdjustmentForOrder?.description || '',
            suggestionReason: suggestionDiscount?.reason || null,
            suggestionDiscount: suggestionDiscount?.extraDiscount || 0
          },
          latitude: addressCoords?.lat || null,
          longitude: addressCoords?.lon || null,
          subscription: subscriptionBenefits.hasActiveSubscription ? {
            plan: subscriptionBenefits.plan,
            usedDelivery: useSubscriptionDelivery,
            pickingFee: subscriptionBenefits.pickingFeePerProduct,
            deliveriesRemaining: useSubscriptionDelivery 
              ? subscriptionBenefits.deliveriesRemaining - 1 
              : subscriptionBenefits.deliveriesRemaining
          } : null
        },
        orderFormData: {
          name,
          phone,
          address,
          streetNumber,
          addressNotes,
          addressCoords,
          store,
          deliveryDate: deliveryDate.toISOString(),
          timeSlot,
          items: finalItems,
          filteredStores
        }
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Menu principale
          </Button>
          <h1 className="text-3xl font-bold mb-2">Ordine rapido</h1>
          <p className="text-muted-foreground">Compila i dati e aggiungi i prodotti</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli ordine</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome e cognome</Label>
                <Input
                  id="name"
                  placeholder="Mario Rossi"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.has('name')) {
                      const newErrors = new Set(fieldErrors);
                      newErrors.delete('name');
                      setFieldErrors(newErrors);
                    }
                  }}
                  className={cn(fieldErrors.has('name') && "border-destructive animate-shake")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="333 123 4567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.has('phone')) {
                      const newErrors = new Set(fieldErrors);
                      newErrors.delete('phone');
                      setFieldErrors(newErrors);
                    }
                  }}
                  className={cn(fieldErrors.has('phone') && "border-destructive animate-shake")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo di consegna</Label>
                <div className={cn(fieldErrors.has('address') && "animate-shake")}>
                  <AddressAutocomplete
                    value={address}
                    onSelect={(addr, lat, lon) => {
                      setAddress(addr);
                      setAddressCoords({ lat, lon });
                      if (fieldErrors.has('address')) {
                        const newErrors = new Set(fieldErrors);
                        newErrors.delete('address');
                        setFieldErrors(newErrors);
                      }
                    }}
                    placeholder="Via, Piazza, Corso... (senza numero civico)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streetNumber">Numero civico *</Label>
                  <Input
                    id="streetNumber"
                    placeholder="Es: 123"
                    value={streetNumber}
                    onChange={(e) => {
                      setStreetNumber(e.target.value);
                      if (fieldErrors.has('streetNumber')) {
                        const newErrors = new Set(fieldErrors);
                        newErrors.delete('streetNumber');
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={cn(fieldErrors.has('streetNumber') && "border-destructive animate-shake")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressNotes">Note indirizzo (opzionale)</Label>
                  <Input
                    id="addressNotes"
                    placeholder="Es: Scala A, Interno 5"
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store">Supermercato</Label>
                {address && addressCoords ? (
                  <Tabs defaultValue="map" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="map">Mappa</TabsTrigger>
                      <TabsTrigger value="list">Lista</TabsTrigger>
                    </TabsList>
                    <TabsContent value="map" className="mt-4">
                      <SupermarketMap 
                        onSelectStore={async (storeName) => {
                          setStore(storeName);
                          
                          if (fieldErrors.has('store')) {
                            const newErrors = new Set(fieldErrors);
                            newErrors.delete('store');
                            setFieldErrors(newErrors);
                          }
                          
                          // Find store coordinates
                          const selectedStore = stores.find(s => `${s.name} - ${s.address}` === storeName);
                          if (selectedStore) {
                            setSelectedStoreCoords({ lat: selectedStore.lat, lng: selectedStore.lng });
                          }
                          
                          // Check meal voucher acceptance
                          const storeNameOnly = storeName.split(' - ')[0].trim();
                          try {
                            const { data } = await supabase
                              .from('supermarkets')
                              .select('accepts_meal_vouchers, meal_voucher_types')
                              .ilike('name', storeNameOnly)
                              .limit(1)
                              .single();
                            
                            if (data) {
                              setStoreVoucherInfo({
                                accepts: data.accepts_meal_vouchers,
                                types: data.meal_voucher_types as string[] || []
                              });
                            } else {
                              setStoreVoucherInfo(null);
                            }
                          } catch (error) {
                            setStoreVoucherInfo(null);
                          }
                        }} 
                        deliveryAddress={address} 
                        onStoresUpdate={handleStoresUpdate} 
                      />
                      {store && (
                        <>
                          <p className="text-sm text-muted-foreground mt-2">
                            Selezionato: <strong>{store}</strong>
                          </p>
                          {storeVoucherInfo && (
                            <div className="mt-1">
                              {storeVoucherInfo.accepts ? (
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <Receipt className="h-3 w-3" />
                                  Accetta buoni pasto: {storeVoucherInfo.types.join(', ')}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Non accetta buoni pasto
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                    <TabsContent value="list" className="mt-4">
                      <Select value={store} onValueChange={async (value) => {
                        setStore(value);
                        
                        if (fieldErrors.has('store')) {
                          const newErrors = new Set(fieldErrors);
                          newErrors.delete('store');
                          setFieldErrors(newErrors);
                        }
                        
                        // Find store coordinates
                        const selectedStore = stores.find(s => `${s.name} - ${s.address}` === value);
                        if (selectedStore) {
                          setSelectedStoreCoords({ lat: selectedStore.lat, lng: selectedStore.lng });
                        }
                        
                        // Check meal voucher acceptance
                        const storeNameOnly = value.split(' - ')[0].trim();
                        try {
                          const { data } = await supabase
                            .from('supermarkets')
                            .select('accepts_meal_vouchers, meal_voucher_types')
                            .ilike('name', storeNameOnly)
                            .limit(1)
                            .single();
                          
                          if (data) {
                            setStoreVoucherInfo({
                              accepts: data.accepts_meal_vouchers,
                              types: data.meal_voucher_types as string[] || []
                            });
                          } else {
                            setStoreVoucherInfo(null);
                          }
                        } catch (error) {
                          setStoreVoucherInfo(null);
                        }
                      }}>
                        <SelectTrigger id="store" className={cn(fieldErrors.has('store') && "border-destructive animate-shake")}>
                          <SelectValue placeholder="Seleziona un supermercato" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStores.length > 0 ? (
                            filteredStores.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Nessun supermercato nel raggio di 7km
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {store && storeVoucherInfo && (
                        <div className="mt-2">
                          {storeVoucherInfo.accepts ? (
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <Receipt className="h-3 w-3" />
                              Accetta buoni pasto: {storeVoucherInfo.types.join(', ')}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Non accetta buoni pasto
                            </p>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    Inserisci prima l'indirizzo di consegna per vedere i supermercati disponibili
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data di consegna</Label>
                <DeliveryDatePicker
                  value={deliveryDate}
                  onChange={(date) => {
                    setDeliveryDate(date);
                    if (fieldErrors.has('deliveryDate')) {
                      const newErrors = new Set(fieldErrors);
                      newErrors.delete('deliveryDate');
                      setFieldErrors(newErrors);
                    }
                  }}
                  suggestedDates={suggestedDates}
                  hasError={fieldErrors.has('deliveryDate')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSlot">Fascia oraria</Label>
                <Select value={timeSlot} onValueChange={(value) => {
                  setTimeSlot(value);
                  if (fieldErrors.has('timeSlot')) {
                    const newErrors = new Set(fieldErrors);
                    newErrors.delete('timeSlot');
                    setFieldErrors(newErrors);
                  }
                }}>
                  <SelectTrigger id="timeSlot" className={cn(fieldErrors.has('timeSlot') && "border-destructive animate-shake")}>
                    <SelectValue placeholder="Seleziona una fascia oraria" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3" id="items">
                <div className="flex items-center justify-between">
                  <Label className={cn(fieldErrors.has('items') && "text-destructive")}>Lista della spesa</Label>
                  {!store && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                      Seleziona prima un supermercato
                    </Badge>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportDialog(true)}
                      disabled={!store}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Importa lista
                    </Button>
                    {items.length > 0 && items.some(item => item.name.trim() !== "") && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Sei sicuro di voler svuotare il carrello?")) {
                            setItems([{ name: "", price: null, loading: false, quantity: 1, suggestion: null }]);
                            toast({
                              title: "Carrello svuotato",
                              description: "Tutti gli articoli sono stati rimossi",
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Svuota carrello
                      </Button>
                    )}
                  </div>
                </div>
                {fieldErrors.has('items') && (
                  <p className="text-sm text-destructive">Aggiungi almeno un prodotto</p>
                )}
                
                {!store ? (
                  <div className="p-4 bg-muted/50 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      👆 Prima seleziona un supermercato per compilare la lista della spesa
                    </p>
                  </div>
                ) : (
                  <>
                {items.map((item, index) => (
                  <div key={index} className={cn("space-y-2 p-4 border rounded-lg bg-card", fieldErrors.has('items') && "border-destructive animate-shake")}>
                    <div className="flex gap-2 items-start">
                      <div className="flex-[6] min-w-0">
                        <div className="space-y-1">
                          <Label htmlFor={`item-name-${index}`} className="text-xs text-muted-foreground">
                            Prodotto *
                          </Label>
                          <Input
                            id={`item-name-${index}`}
                            placeholder="Es: Latte 1L"
                            value={item.name}
                            onChange={(e) => {
                              updateItemName(index, e.target.value);
                              if (fieldErrors.has('items') && e.target.value.trim()) {
                                const newErrors = new Set(fieldErrors);
                                newErrors.delete('items');
                                setFieldErrors(newErrors);
                              }
                            }}
                            onBlur={() => fetchPrice(index, item.name)}
                            required
                            className="w-full"
                          />
                          {item.completedName && (
                            <p className="text-[0.7rem] italic text-blue-600 dark:text-blue-400 mt-0.5">
                              {item.completedName}
                            </p>
                          )}
                          {item.suggestion && (
                            <p className="text-[0.7rem] text-amber-600 dark:text-amber-400 mt-0.5">
                              {item.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="w-16 flex-shrink-0">
                        <Label htmlFor={`item-qty-${index}`} className="text-xs text-muted-foreground">
                          Qtà
                        </Label>
                        <Input
                          id={`item-qty-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="text-center"
                          placeholder="Qtà"
                        />
                      </div>
                      <div className="w-20 flex-shrink-0 text-right font-medium flex items-center justify-end gap-2 pt-6">
                        {item.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : item.price !== null ? (
                          <div className="flex flex-col items-end">
                            <span className={item.isEstimated ? "text-amber-600" : ""}>
                              €{(item.price * item.quantity).toFixed(2)}
                            </span>
                            {item.isEstimated && (
                              <span className="text-xs text-amber-600">stimato</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      {items.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi prodotto
                </Button>
                  </>
                )}
                
                {total > 0 && (
                  <div className="space-y-4">
                    {/* Bag Counter */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Buste necessarie</span>
                          </div>
                          <Badge variant={bags <= 3 ? "secondary" : "default"}>
                            {bags} {bags === 1 ? 'busta' : 'buste'}
                          </Badge>
                        </div>
                        {bags > 3 && (
                          <p className="text-sm text-muted-foreground">
                            Supplemento buste: +€{supplements.bagFee.toFixed(2)} ({bags - 3} buste extra × €3)
                          </p>
                        )}
                        {waterLiters > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Volume acqua: {waterLiters.toFixed(1)}L
                            {supplements.waterFee > 0 && ` (+€${supplements.waterFee.toFixed(2)} oltre 9L)`}
                            {supplements.waterOnlyFee > 0 && ` (Ordine solo bevande: +€${supplements.waterOnlyFee.toFixed(2)})`}
                          </p>
                        )}
                        {supplements.drinksOnlyError && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {supplements.drinksOnlyError}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Minimum Spend Alert */}
                    {!meetsMinimum && (
                      <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                                Spesa minima richiesta: €25
                              </p>
                              <p className="text-yellow-700 dark:text-yellow-300">
                                Mancano €{(25 - total).toFixed(2)} per raggiungere la spesa minima
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Total Breakdown */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotale prodotti:</span>
                        <span>€{total.toFixed(2)}</span>
                      </div>
                      {supplements.total > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Supplementi:</span>
                          <span>€{supplements.total.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span>Costo consegna stimato</span>
                          {addressCoords && selectedStoreCoords && (() => {
                            const distance = calculateDistance(
                              addressCoords.lat,
                              addressCoords.lon,
                              selectedStoreCoords.lat,
                              selectedStoreCoords.lng
                            );
                            const zone = distance <= 7 ? "Zona 1 (0-7km)" : distance <= 10 ? "Zona 2 (7-10km)" : "Zona 3 (>10km)";
                            return (
                              <span className="text-xs text-muted-foreground">
                                {zone} - {distance.toFixed(1)}km
                              </span>
                            );
                          })()}
                        </div>
                        <span>
                          {addressCoords && selectedStoreCoords 
                            ? `€${calculateDeliveryFee(
                                calculateDistance(
                                  addressCoords.lat,
                                  addressCoords.lon,
                                  selectedStoreCoords.lat,
                                  selectedStoreCoords.lng
                                ),
                                total
                              ).toFixed(2)}`
                            : "da calcolare"
                          }
                        </span>
                      </div>
                      {/* Scheduling adjustment row */}
                      {schedulingAmount !== 0 && (
                        <div className={cn(
                          "flex justify-between",
                          schedulingAmount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                        )}>
                          <div className="flex flex-col gap-0.5">
                            <span>{schedulingAmount > 0 ? "Supplemento urgenza" : "Sconto programmazione"}</span>
                            {schedulingAdjustment?.description && (
                              <span className="text-xs opacity-80">{schedulingAdjustment.description}</span>
                            )}
                            {selectedSuggestion && (
                              <span className="text-xs opacity-80">+ Bonus consegna raggruppata</span>
                            )}
                          </div>
                          <span className="font-medium">
                            {schedulingAmount > 0 ? '+' : ''}€{schedulingAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold text-lg">Totale stimato:</span>
                        <span className="font-bold text-xl text-primary">
                          €{(finalTotal + schedulingAmount + (addressCoords && selectedStoreCoords 
                            ? calculateDeliveryFee(
                                calculateDistance(
                                  addressCoords.lat,
                                  addressCoords.lon,
                                  selectedStoreCoords.lat,
                                  selectedStoreCoords.lng
                                ),
                                total
                              )
                            : 0
                          )).toFixed(2)}
                        </span>
                      </div>
                      {addressCoords && selectedStoreCoords && (
                        <p className="text-xs text-muted-foreground text-right">
                          Consegna basata su distanza di {calculateDistance(
                            addressCoords.lat,
                            addressCoords.lon,
                            selectedStoreCoords.lat,
                            selectedStoreCoords.lng
                          ).toFixed(1)}km 
                          {total >= 50 && " (sconto per spesa ≥€50)"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <PriceComparison items={items} currentStore={store} />

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={!allPricesLoaded || !meetsMinimum || anyLoading || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifica autenticazione...
                  </>
                ) : anyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Caricamento prezzi...
                  </>
                ) : !allPricesLoaded ? (
                  "Completa i prezzi per continuare"
                ) : !meetsMinimum ? (
                  "Spesa minima €25"
                ) : (
                  "Procedi al pagamento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />

      {/* Import List Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Importa lista della spesa</DialogTitle>
            <DialogDescription>
              Incolla la tua lista della spesa o carica un file di testo. Ogni riga sarà un prodotto.
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Formati supportati: "Latte", "2x Pane", "3 Acqua 1.5L"
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-text">Incolla la tua lista</Label>
              <Textarea
                id="import-text"
                placeholder={"Latte\n2x Pane\nAcqua 1.5L\nPasta 500g\n..."}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">oppure</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-file">Carica un file</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="import-file"
                  type="file"
                  accept=".txt,.doc,.docx,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                      setImportText(""); // Clear manual text when file is selected
                    }
                  }}
                  className="cursor-pointer"
                />
                {importFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setImportFile(null);
                      const fileInput = document.getElementById('import-file') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {importFile && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {importFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportText("");
                setImportFile(null);
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleImportList}
              disabled={!importText.trim() && !importFile}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 pb-20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Nuovo Ordine</CardTitle>
            <CardDescription>
              Compila il form per creare il tuo ordine personalizzato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ... rest of form content remains the same ... */}
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Order;
