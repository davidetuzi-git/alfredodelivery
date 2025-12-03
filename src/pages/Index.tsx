import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Benefits } from "@/components/Benefits";
import { ZoneExpansion } from "@/components/ZoneExpansion";
import { CallToAction } from "@/components/CallToAction";
import { Footer } from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import { SlidingPartnerBanners } from "@/components/SlidingPartnerBanners";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      
      {/* Sliding Partner Banners */}
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <SlidingPartnerBanners />
      </div>
      
      <HowItWorks />
      <Benefits />
      <ZoneExpansion />
      <CallToAction />
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;
