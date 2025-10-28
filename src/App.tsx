import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Order from "./pages/Order";
import OrderSummary from "./pages/OrderSummary";
import Checkout from "./pages/Checkout";
import CardPayment from "./pages/CardPayment";
import PayPalSuccess from "./pages/PayPalSuccess";
import OrderTracking from "./pages/OrderTracking";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import PersonalData from "./pages/PersonalData";
import PriceSearch from "./pages/PriceSearch";
import CompareStores from "./pages/CompareStores";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ReportStore from "./pages/ReportStore";
import HowItWorksPage from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/ordina" element={<Order />} />
          <Route path="/riepilogo-ordine" element={<OrderSummary />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/card-payment" element={<CardPayment />} />
          <Route path="/paypal-success" element={<PayPalSuccess />} />
          <Route path="/tracking" element={<OrderTracking />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profilo" element={<Profile />} />
          <Route path="/dati-personali" element={<PersonalData />} />
          <Route path="/prezzi" element={<PriceSearch />} />
          <Route path="/confronta" element={<CompareStores />} />
          <Route path="/segnala-supermercato" element={<ReportStore />} />
          <Route path="/come-funziona" element={<HowItWorksPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
