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
import { UserSubmenu } from "@/components/UserSubmenu";
import { Plus, X, Loader2, Trash2, ArrowLeft, ShoppingBag, AlertCircle, Receipt, FileText, Upload, Save, FolderOpen, Calendar } from "lucide-react";
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
import { useServiceCalendar } from "@/hooks/useServiceCalendar";
import { useSubscription, SUBSCRIPTION_PLANS } from "@/hooks/useSubscription";
import { useLoyalty, LOYALTY_LEVELS } from "@/hooks/useLoyalty";
import { isSameDay } from "date-fns";
import AlcoholVerificationDialog from "@/components/AlcoholVerificationDialog";
import ResponsibleDrinkingDialog from "@/components/ResponsibleDrinkingDialog";
import { containsAlcohol, useAlcoholVerification } from "@/hooks/useAlcoholDetection";

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
        
        // Pre-fill address if not already set and geocode it for map preloading
        if (!savedState?.address && profile.address) {
          const fullAddress = `${profile.address}${profile.city ? ', ' + profile.city : ''}${profile.postal_code ? ', ' + profile.postal_code : ''}`;
          setAddress(fullAddress);
          
          // Geocode the address to preload the map
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=it&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
              setAddressCoords({
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
              });
            }
          } catch (error) {
            console.error('Error geocoding profile address:', error);
          }
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
  
  const [showAlternativesDialog, setShowAlternativesDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  
  // Flexible delivery option "Let Alfredo decide"
  const [flexibleDelivery, setFlexibleDelivery] = useState(false);
  
  // Alcohol verification state
  const [showAlcoholVerificationDialog, setShowAlcoholVerificationDialog] = useState(false);
  const [showResponsibleDrinkingDialog, setShowResponsibleDrinkingDialog] = useState(false);
  const [alcoholCheckPassed, setAlcoholCheckPassed] = useState(false);
  const { isVerified: isAlcoholVerified, refreshVerification: refreshAlcoholVerification } = useAlcoholVerification();
  
  // Saved shopping lists state
  const [savedLists, setSavedLists] = useState<Array<{ id: string; name: string; items: any; store: string | null; created_at: string }>>([]);
  const [showSaveListDialog, setShowSaveListDialog] = useState(false);
  const [showLoadListDialog, setShowLoadListDialog] = useState(false);
  const [saveListName, setSaveListName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  // Use scheduling pricing hook for smart date suggestions
  const { suggestedDates } = useSchedulingPricing(
    store,
    addressCoords?.lat || null,
    addressCoords?.lon || null
  );

  // Use service calendar for holiday detection
  const { isDateHoliday } = useServiceCalendar();

  // Calculate scheduling adjustment for current date selection
  const schedulingAdjustment = calculateSchedulingAdjustment(deliveryDate);
  const holidayInfo = deliveryDate ? isDateHoliday(deliveryDate) : { isHoliday: false };
  
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
  
  // Get loyalty benefits for delivery discounts
  const { loyaltyProfile, getBenefits } = useLoyalty();
  const loyaltyBenefits = loyaltyProfile ? getBenefits(loyaltyProfile.current_level) : null;

  // Calculate delivery fee based on distance and subtotal
  // If user has subscription with remaining deliveries, delivery is FREE
  // Otherwise apply loyalty discount
  const calculateDeliveryFee = (distance: number, subtotal: number, useSubscriptionDelivery: boolean = false): { baseFee: number; loyaltyDiscount: number; finalFee: number } => {
    if (useSubscriptionDelivery && subscriptionBenefits.deliveriesRemaining > 0) {
      return { baseFee: 0, loyaltyDiscount: 0, finalFee: 0 }; // Free delivery for subscribers with remaining deliveries
    }
    
    let baseFee = 10;
    if (distance <= 7) {
      baseFee = subtotal < 50 ? 10 : 8;
    } else if (distance <= 10) {
      baseFee = subtotal < 50 ? 15 : 12;
    } else {
      baseFee = 20; // High fee for >10km deliveries
    }
    
    // Apply loyalty discount
    const loyaltyDiscountPercent = loyaltyBenefits?.deliveryDiscount || 0;
    const loyaltyDiscount = baseFee * (loyaltyDiscountPercent / 100);
    const finalFee = baseFee - loyaltyDiscount;
    
    return { baseFee, loyaltyDiscount, finalFee };
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
    try {
      // Strip large data (imageUrl) from items to avoid quota exceeded
      const lightItems = items.map(item => ({
        name: item.name,
        price: item.price,
        loading: false, // Don't persist loading state
        quantity: item.quantity,
        suggestion: item.suggestion,
        completedName: item.completedName,
        productAvailable: item.productAvailable,
        suggestedAlternative: item.suggestedAlternative,
        isEstimated: item.isEstimated,
        originalName: item.originalName,
        // Exclude imageUrl to save space
      }));
      
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
        items: lightItems,
        // Don't save filteredStores - it's dynamic anyway
      };
      
      sessionStorage.setItem('orderFormData', JSON.stringify(formData));
    } catch (error) {
      // If quota exceeded, clear old data and try again
      console.warn('SessionStorage quota exceeded, clearing old data');
      sessionStorage.removeItem('orderFormData');
    }
  }, [name, phone, address, streetNumber, addressNotes, addressCoords, store, deliveryDate, timeSlot, items]);

  const timeSlots = [
    "9:00 - 11:00",
    "11:00 - 13:00",
    "15:00 - 17:00",
    "17:00 - 19:00"
  ];

  // Check if cart contains refrigerated/frozen products
  // Nota: manteniamo la lista volutamente “stretta” per evitare falsi positivi (es. uova, latte UHT).
  const REFRIGERATED_KEYWORDS = [
    // Dairy davvero da frigo
    'yogurt', 'formaggio', 'burro', 'mozzarella', 'ricotta', 'panna',
    'latte fresco', 'latte pastorizzato', 'latte microfiltrato',

    // Salumi / carne / pesce
    'affettato', 'prosciutto', 'salame', 'mortadella', 'speck', 'bresaola',
    'wurstel', 'würstel', 'salsiccia', 'carne', 'pollo', 'manzo', 'maiale',
    'pesce', 'salmone', 'tonno fresco', 'gamberi', 'cozze', 'vongole',

    // Surgelati
    'surgelat', 'congelat', 'gelato', 'ghiacciolo', 'frozen',
  ];
  
  const hasRefrigeratedProducts = (): boolean => {
    return items.some(item => {
      const nameLower = item.name.toLowerCase();
      return REFRIGERATED_KEYWORDS.some(keyword => nameLower.includes(keyword));
    });
  };

  const getRefrigeratedProductsList = (): string[] => {
    return items
      .filter(item => {
        const nameLower = item.name.toLowerCase();
        return REFRIGERATED_KEYWORDS.some(keyword => nameLower.includes(keyword));
      })
      .map(item => item.name);
  };

  const addItem = () => {
    setItems([...items, { name: "", price: null, loading: false, quantity: 1, suggestion: null }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleImportList = async () => {
    const textToImport = importText;

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
      .map(line => line.replace(/\r/g, '').trim())
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
    const newItems: ShoppingItem[] = lines.map(rawLine => {
      // Remove common bullet prefixes
      const line = rawLine.replace(/^[-•*]\s+/, '').trim();

      // 1) Quantity prefix: "2x Latte" or "3 Pane"
      const qtyPrefixMatch = line.match(/^(\d+)\s*[x×]\s*(.+)$/i) || line.match(/^(\d+)\s+(.+)$/);
      if (qtyPrefixMatch) {
        const quantity = parseInt(qtyPrefixMatch[1]);
        const name = qtyPrefixMatch[2].trim();
        return {
          name,
          price: null,
          loading: false,
          quantity: quantity > 0 ? quantity : 1,
          suggestion: null,
        };
      }

      // 2) Dash/en-dash quantity: "Pane – 1 pezzo" / "Latte - 2"
      const dashQtyMatch = line.match(/^(.+?)\s*[–-]\s*(\d+)\b/);
      if (dashQtyMatch) {
        const name = dashQtyMatch[1].trim();
        const quantity = parseInt(dashQtyMatch[2]);
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

    // Fetch prices for all items (only if a store is selected)
    if (store) {
      newItems.forEach((item, index) => {
        if (item.name.trim()) {
          fetchPrice(index, item.name);
        }
      });
    }

    // Close dialog and reset
    setShowImportDialog(false);
    setImportText("");

    toast({
      title: "Lista importata",
      description: `${newItems.length} ${newItems.length === 1 ? 'prodotto aggiunto' : 'prodotti aggiunti'}`,
    });
  };

  // Load saved lists from database
  const loadSavedLists = async () => {
    if (!session?.user?.id) return;
    
    setLoadingLists(true);
    try {
      const { data, error } = await supabase
        .from('saved_shopping_lists')
        .select('id, name, items, store, created_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setSavedLists(data || []);
    } catch (error) {
      console.error('Error loading saved lists:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le liste salvate",
        variant: "destructive",
      });
    } finally {
      setLoadingLists(false);
    }
  };

  // Save current list to database
  const handleSaveList = async () => {
    if (!session?.user?.id) return;
    if (!saveListName.trim()) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per la lista",
        variant: "destructive",
      });
      return;
    }
    
    const validItems = items.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) {
      toast({
        title: "Lista vuota",
        description: "Aggiungi almeno un prodotto prima di salvare",
        variant: "destructive",
      });
      return;
    }
    
    setSavingList(true);
    try {
      const { error } = await supabase
        .from('saved_shopping_lists')
        .insert({
          user_id: session.user.id,
          name: saveListName.trim(),
          items: validItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            completedName: item.completedName,
          })),
          store: store || null,
          delivery_address: address || null,
          address_coords: addressCoords || null,
        });
      
      if (error) throw error;
      
      toast({
        title: "Lista salvata",
        description: `"${saveListName}" salvata con ${validItems.length} prodotti`,
      });
      
      setShowSaveListDialog(false);
      setSaveListName("");
    } catch (error) {
      console.error('Error saving list:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la lista",
        variant: "destructive",
      });
    } finally {
      setSavingList(false);
    }
  };

  // Load a saved list into the form
  const handleLoadList = async (listId: string) => {
    const selectedList = savedLists.find(l => l.id === listId);
    if (!selectedList) return;
    
    // Convert saved items back to ShoppingItem format
    const loadedItems: ShoppingItem[] = selectedList.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity || 1,
      price: item.price || null,
      loading: false,
      suggestion: null,
      completedName: item.completedName || null,
    }));
    
    setItems(loadedItems.length > 0 ? loadedItems : [{ name: "", price: null, loading: false, quantity: 1, suggestion: null }]);
    
    // Optionally restore store
    if (selectedList.store) {
      setStore(selectedList.store);
    }
    
    // Refresh prices if store is selected
    if (store || selectedList.store) {
      loadedItems.forEach((item, index) => {
        if (item.name.trim()) {
          fetchPrice(index, item.name);
        }
      });
    }
    
    setShowLoadListDialog(false);
    toast({
      title: "Lista caricata",
      description: `"${selectedList.name}" caricata con ${loadedItems.length} prodotti`,
    });
  };

  // Delete a saved list
  const handleDeleteList = async (listId: string, listName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${listName}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('saved_shopping_lists')
        .delete()
        .eq('id', listId);
      
      if (error) throw error;
      
      setSavedLists(prev => prev.filter(l => l.id !== listId));
      toast({
        title: "Lista eliminata",
        description: `"${listName}" eliminata`,
      });
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la lista",
        variant: "destructive",
      });
    }
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
          storeName: store,
          userId: session?.user?.id || null
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

  // Calculate bags needed - 15L OR 12 pieces = 1 bag
  // Water crates (9-12L) count as 1 separate bag each
  const calculateBags = () => {
    const validItems = items.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) return 0;
    
    let estimatedVolume = 0; // in liters (excluding water crates)
    let productCount = 0; // excluding water crates
    let waterCrateBags = 0; // separate bags for water crates
    
    validItems.forEach(item => {
      const itemName = item.name.toLowerCase();
      const qty = item.quantity;
      
      // Check for water crates (typically 6x1.5L = 9L or 6x2L = 12L)
      const isWaterCrate = (itemName.includes('acqua') || itemName.includes('water')) &&
        (itemName.includes('cassa') || itemName.includes('6x') || itemName.includes('6 x'));
      
      if (isWaterCrate) {
        // Each water crate (9-12L) counts as 1 separate bag
        waterCrateBags += qty;
      } else {
        // Regular items
        productCount += qty;
        
        // Volume estimates per product type (in liters)
        if (itemName.includes('acqua') || itemName.includes('water')) {
          // Individual water bottles
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
      }
    });
    
    // Calculate bags needed for regular items:
    // 1. Product count: max 12 products per bag
    // 2. Volume: max 15L per bag
    const bagsByCount = Math.ceil(productCount / 12);
    const bagsByVolume = Math.ceil(estimatedVolume / 15);
    
    // Use the larger number (more restrictive constraint)
    const regularBags = Math.max(bagsByCount, bagsByVolume);
    
    // Total bags = regular bags + water crate bags
    const totalBags = regularBags + waterCrateBags;
    return Math.max(validItems.length > 0 ? 1 : 0, totalBags);
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
    // Validate date/time only if not using flexible delivery
    if (!flexibleDelivery) {
      if (!deliveryDate) {
        errors.add('deliveryDate');
        errorMessages.push('Data di consegna');
      }
      if (!timeSlot) {
        errors.add('timeSlot');
        errorMessages.push('Fascia oraria');
      }
    }
    
    // Validate flexible delivery doesn't have refrigerated products
    if (flexibleDelivery && hasRefrigeratedProducts()) {
      toast({
        title: "Errore",
        description: "La consegna flessibile non è disponibile per ordini con prodotti freschi, refrigerati o surgelati. Rimuovi questi prodotti o scegli una data specifica.",
        variant: "destructive",
      });
      return;
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
    
    // Check for items with suggested alternatives
    const itemsWithAlternatives = validItems.filter(item => 
      item.suggestedAlternative && item.suggestedAlternative.trim() !== ''
    );
    
    // If there are alternatives and user hasn't confirmed yet, show dialog
    if (itemsWithAlternatives.length > 0 && !pendingSubmit) {
      setShowAlternativesDialog(true);
      return;
    }

    // Check for alcohol products and verify age
    const hasAlcohol = containsAlcohol(validItems);
    if (hasAlcohol && !alcoholCheckPassed) {
      // Check if user is verified for alcohol purchases
      if (!isAlcoholVerified) {
        setShowAlcoholVerificationDialog(true);
        return;
      }
      // User is verified but hasn't seen the responsible drinking message yet
      setShowResponsibleDrinkingDialog(true);
      return;
    }
    
    // Reset flags ONLY after all dialogs have been handled successfully
    // This prevents dialogs from re-appearing when form is re-submitted
    setPendingSubmit(false);
    setAlcoholCheckPassed(false);

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
    let deliveryFeeData = { baseFee: 10, loyaltyDiscount: 0, finalFee: 10 }; // Default for Zona 1 (0-7km) with <50€ spend
    let deliveryDistance = 0;
    
    if (addressCoords && selectedStoreCoords) {
      deliveryDistance = calculateDistance(
        addressCoords.lat,
        addressCoords.lon,
        selectedStoreCoords.lat,
        selectedStoreCoords.lng
      );
      deliveryFeeData = calculateDeliveryFee(deliveryDistance, calculatedTotal, useSubscriptionDelivery);
    } else {
      // If we don't have coordinates, use default based on subtotal
      const baseFee = useSubscriptionDelivery ? 0 : (calculatedTotal < 50 ? 10 : 8);
      const loyaltyDiscountPercent = loyaltyBenefits?.deliveryDiscount || 0;
      const loyaltyDiscount = baseFee * (loyaltyDiscountPercent / 100);
      deliveryFeeData = { baseFee, loyaltyDiscount, finalFee: baseFee - loyaltyDiscount };
    }

    // Calculate service fee (uses subscription picking fee if available)
    const serviceFee = calculateServiceFee(finalItems);
    
    // Calculate scheduling adjustment (discount or surcharge based on delivery date)
    // For flexible delivery, apply maximum discount of -€5.00
    let schedulingAdjustmentForOrder = deliveryDate ? calculateSchedulingAdjustment(deliveryDate) : null;
    let suggestionDiscount = deliveryDate ? suggestedDates.find(s => isSameDay(s.date, deliveryDate)) : null;
    let holidayInfoForOrder = deliveryDate ? isDateHoliday(deliveryDate) : { isHoliday: false };
    let holidaySurcharge = holidayInfoForOrder.isHoliday ? (holidayInfoForOrder.surcharge || 10) : 0;
    let totalSchedulingAdjustment = (schedulingAdjustmentForOrder?.amount || 0) + 
      (suggestionDiscount ? -suggestionDiscount.extraDiscount : 0);
    
    // If using flexible delivery, override with maximum discount
    if (flexibleDelivery) {
      totalSchedulingAdjustment = -5; // Maximum discount
      holidaySurcharge = 0; // No holiday surcharge for flexible
    }
    
    navigate("/riepilogo-ordine", { 
      state: { 
        orderData: {
          name,
          phone,
          address: fullAddress,
          store,
          deliveryDate: flexibleDelivery ? null : deliveryDate?.toISOString(),
          timeSlot: flexibleDelivery ? null : timeSlot,
          flexibleDelivery,
          items: finalItems.map(item => ({
            name: item.name,
            price: item.price || 0,
            quantity: item.quantity,
            isEstimated: item.isEstimated,
            originalName: item.originalName,
            imageUrl: item.imageUrl // Include image URL
          })),
          supplements: {
            bagFee: supplements.bagFee,
            waterFee: supplements.waterFee,
            waterOnlyFee: supplements.waterOnlyFee,
            total: supplements.total
          },
          deliveryFee: deliveryFeeData.finalFee,
          deliveryFeeBase: deliveryFeeData.baseFee,
          loyaltyDiscount: deliveryFeeData.loyaltyDiscount,
          deliveryDistance,
          serviceFee,
          holidaySurcharge,
          holidayName: holidayInfoForOrder.isHoliday ? (holidayInfoForOrder as any).name : null,
          schedulingAdjustment: {
            amount: totalSchedulingAdjustment,
            description: flexibleDelivery 
              ? 'Consegna flessibile: Alfredo sceglie la data migliore' 
              : (schedulingAdjustmentForOrder?.description || ''),
            suggestionReason: flexibleDelivery ? 'Massimo risparmio con consegna flessibile' : (suggestionDiscount?.reason || null),
            suggestionDiscount: flexibleDelivery ? 5 : (suggestionDiscount?.extraDiscount || 0)
          },
          latitude: addressCoords?.lat || null,
          longitude: addressCoords?.lon || null,
          loyalty: loyaltyProfile ? {
            level: loyaltyProfile.current_level,
            discountPercent: loyaltyBenefits?.deliveryDiscount || 0,
            discountAmount: deliveryFeeData.loyaltyDiscount
          } : null,
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
          deliveryDate: flexibleDelivery ? null : deliveryDate?.toISOString(),
          timeSlot: flexibleDelivery ? null : timeSlot,
          flexibleDelivery,
          items: finalItems,
          filteredStores
        }
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <UserSubmenu />
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

              <div className="space-y-4">
                <Label>Data di consegna</Label>
                
                {/* Flexible Delivery Option */}
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    flexibleDelivery 
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                      : "border-dashed border-muted-foreground/30 hover:border-primary/50"
                  )}
                  onClick={() => {
                    if (hasRefrigeratedProducts()) {
                      toast({
                        title: "Opzione non disponibile",
                        description: "La consegna flessibile non è disponibile per ordini con prodotti freschi, refrigerati o surgelati.",
                        variant: "destructive"
                      });
                      return;
                    }
                    setFlexibleDelivery(!flexibleDelivery);
                    if (!flexibleDelivery) {
                      setDeliveryDate(undefined);
                      setTimeSlot("");
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      flexibleDelivery ? "border-green-500 bg-green-500" : "border-muted-foreground/50"
                    )}>
                      {flexibleDelivery && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          🎯 Lascia decidere ad Alfredo
                          <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs">
                            -€5,00
                          </Badge>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        L'opzione più economica! Consegna entro 7 giorni con notifica 24h prima.
                      </p>
                    </div>
                  </div>
                  
                  {flexibleDelivery && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 space-y-2 text-xs">
                      <p className="font-medium text-green-700 dark:text-green-300">📋 Condizioni:</p>
                      <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                        <li>Consegna garantita entro <strong>7 giorni</strong> dalla data di richiesta</li>
                        <li>Verrai notificato con almeno <strong>24 ore di preavviso</strong></li>
                        <li>Puoi rifiutare la data proposta <strong>una sola volta</strong></li>
                        <li>In caso di rifiuto, riprogrammazione entro i <strong>4 giorni successivi</strong></li>
                        <li className="text-amber-600 dark:text-amber-400">
                          ⚠️ Non disponibile per prodotti freschi, refrigerati o surgelati
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Warning if refrigerated products detected with flexible delivery */}
                {flexibleDelivery && hasRefrigeratedProducts() && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-3">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      ⚠️ Prodotti non compatibili rilevati:
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                      {getRefrigeratedProductsList().slice(0, 5).map((name, idx) => (
                        <li key={idx}>{name}</li>
                      ))}
                      {getRefrigeratedProductsList().length > 5 && (
                        <li>...e altri {getRefrigeratedProductsList().length - 5} prodotti</li>
                      )}
                    </ul>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Rimuovi questi prodotti o scegli una data specifica.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
                      onClick={() => setFlexibleDelivery(false)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Scegli una data specifica
                    </Button>
                  </div>
                )}

                {/* Standard date picker - show when flexible delivery is NOT selected OR when there are refrigerated products */}
                {(!flexibleDelivery || hasRefrigeratedProducts()) && (
                  <>
                    {flexibleDelivery && hasRefrigeratedProducts() ? null : (
                      <div className="relative flex items-center my-2">
                        <div className="flex-grow border-t border-muted-foreground/20"></div>
                        <span className="px-3 text-xs text-muted-foreground">oppure scegli una data</span>
                        <div className="flex-grow border-t border-muted-foreground/20"></div>
                      </div>
                    )}
                    <DeliveryDatePicker
                      value={deliveryDate}
                      onChange={(date) => {
                        setDeliveryDate(date);
                        // Auto-disable flexible delivery when user picks a date
                        if (date && flexibleDelivery) {
                          setFlexibleDelivery(false);
                        }
                        if (fieldErrors.has('deliveryDate')) {
                          const newErrors = new Set(fieldErrors);
                          newErrors.delete('deliveryDate');
                          setFieldErrors(newErrors);
                        }
                      }}
                      suggestedDates={suggestedDates}
                      hasError={fieldErrors.has('deliveryDate')}
                    />
                  </>
                )}
              </div>

              {/* Time slot - show if not flexible delivery OR if there are refrigerated products (must choose specific date/time) */}
              {(!flexibleDelivery || hasRefrigeratedProducts()) && (
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">Fascia oraria</Label>
                  <Select value={timeSlot} onValueChange={(value) => {
                    setTimeSlot(value);
                    // Auto-disable flexible delivery when user picks a time slot
                    if (value && flexibleDelivery) {
                      setFlexibleDelivery(false);
                    }
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
              )}

              <div className="space-y-3" id="items">
                <div className="flex items-center justify-between">
                  <Label className={cn(fieldErrors.has('items') && "text-destructive")}>Lista della spesa</Label>
                  {!store && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                      Seleziona prima un supermercato
                    </Badge>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Importa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        loadSavedLists();
                        setShowLoadListDialog(true);
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Carica
                    </Button>
                    {items.length > 0 && items.some(item => item.name.trim() !== "") && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSaveListDialog(true)}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salva
                        </Button>
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
                          Svuota
                        </Button>
                      </>
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
                            <span className={item.isEstimated ? "text-orange-500 font-semibold" : "text-foreground"}>
                              €{(item.price * item.quantity).toFixed(2)}
                            </span>
                            {item.isEstimated && (
                              <span className="text-[0.65rem] text-orange-500 italic">stimato</span>
                            )}
                          </div>
                        ) : item.productAvailable === false ? (
                          <span className="text-red-500 text-xs">N/D</span>
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
                        <p className="text-xs text-muted-foreground mb-1">
                          1 busta = 15L oppure 12 pezzi. Cassa d'acqua (9-12L) = 1 busta separata.
                        </p>
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
                              ).finalFee.toFixed(2)}`
                            : "da calcolare"
                          }
                        </span>
                      </div>
                      {/* Loyalty discount row */}
                      {loyaltyProfile && loyaltyBenefits && loyaltyBenefits.deliveryDiscount > 0 && addressCoords && selectedStoreCoords && (
                        <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                          <div className="flex items-center gap-1">
                            <span>{LOYALTY_LEVELS[loyaltyProfile.current_level].icon}</span>
                            <span>Sconto fedeltà ({loyaltyBenefits.deliveryDiscount}%)</span>
                          </div>
                          <span>
                            -€{calculateDeliveryFee(
                              calculateDistance(
                                addressCoords.lat,
                                addressCoords.lon,
                                selectedStoreCoords.lat,
                                selectedStoreCoords.lng
                              ),
                              total
                            ).loyaltyDiscount.toFixed(2)}
                          </span>
                        </div>
                      )}
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
                              ).finalFee
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
                          {loyaltyBenefits && loyaltyBenefits.deliveryDiscount > 0 && ` + sconto ${loyaltyBenefits.deliveryDiscount}% fedeltà`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <PriceComparison items={items} currentStore={store} nearbyStores={filteredStores} />

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

              {/* Save order for later button - smaller than main button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setShowSaveListDialog(true);
                  setSaveListName(`Ordine del ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}`);
                }}
                disabled={items.filter(i => i.name.trim() !== "").length === 0}
              >
                <Save className="mr-2 h-4 w-4" />
                Salva ordine per dopo
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportText("");
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleImportList}
              disabled={!importText.trim()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save List Dialog */}
      <Dialog open={showSaveListDialog} onOpenChange={setShowSaveListDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Salva lista della spesa</DialogTitle>
            <DialogDescription>
              Salva la tua lista per completare l'ordine in un secondo momento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Nome della lista</Label>
              <Input
                id="list-name"
                placeholder="Es. Spesa settimanale"
                value={saveListName}
                onChange={(e) => setSaveListName(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {items.filter(i => i.name.trim() !== "").length} prodotti verranno salvati
              {store && ` per ${store.split(' - ')[0]}`}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSaveListDialog(false);
                setSaveListName("");
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSaveList}
              disabled={savingList || !saveListName.trim()}
            >
              {savingList ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load List Dialog */}
      <Dialog open={showLoadListDialog} onOpenChange={setShowLoadListDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Carica lista salvata</DialogTitle>
            <DialogDescription>
              Seleziona una lista salvata per continuare l'ordine
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {loadingLists ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedLists.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Non hai liste salvate
              </p>
            ) : (
              savedLists.map((list) => {
                const listItems = Array.isArray(list.items) ? list.items : [];
                return (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadList(list.id)}>
                      <p className="font-medium">{list.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {listItems.length} prodotti
                        {list.store && ` • ${list.store.split(' - ')[0]}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(list.created_at), "d MMM yyyy, HH:mm", { locale: it })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadList(list.id)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteList(list.id, list.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLoadListDialog(false)}
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alternatives confirmation dialog */}
      <Dialog open={showAlternativesDialog} onOpenChange={setShowAlternativesDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Conferma Alternative
            </DialogTitle>
            <DialogDescription>
              Alcuni prodotti richiesti non sono disponibili presso il supermercato selezionato. 
              Abbiamo trovato le seguenti alternative:
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto space-y-3 py-4">
            {items
              .filter(item => item.suggestedAlternative && item.suggestedAlternative.trim() !== '')
              .map((item, index) => (
                <div key={index} className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground line-through">
                        {item.originalName || item.name}
                      </p>
                      <p className="font-medium text-sm flex items-center gap-1">
                        <span className="text-amber-600">→</span>
                        {item.suggestedAlternative}
                      </p>
                      {item.price && (
                        <p className="text-sm text-primary font-semibold mt-1">
                          €{item.price.toFixed(2)} × {item.quantity}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAlternativesDialog(false)}
              className="w-full sm:w-auto"
            >
              Modifica Lista
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowAlternativesDialog(false);
                setPendingSubmit(true);
                // Re-trigger form submit
                const form = document.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
            >
              Accetto le Alternative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alcohol Verification Dialog */}
      <AlcoholVerificationDialog
        open={showAlcoholVerificationDialog}
        onOpenChange={setShowAlcoholVerificationDialog}
        onVerified={() => {
          refreshAlcoholVerification();
          // After verification, show responsible drinking dialog
          setShowResponsibleDrinkingDialog(true);
        }}
      />

      {/* Responsible Drinking Dialog */}
      <ResponsibleDrinkingDialog
        open={showResponsibleDrinkingDialog}
        onOpenChange={setShowResponsibleDrinkingDialog}
        onAccept={() => {
          setShowResponsibleDrinkingDialog(false);
          setAlcoholCheckPassed(true);
          // Re-trigger form submit
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
      />
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
      <UserSubmenu />
      
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
