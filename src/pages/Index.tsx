import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Benefits } from "@/components/Benefits";
import { CallToAction } from "@/components/CallToAction";
import { Footer } from "@/components/Footer";
import ChatBot from "@/components/ChatBot";

const Index = () => {
  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <Header />
      </div>
      <Hero />
      <HowItWorks />
      <Benefits />
      <CallToAction />
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Index;
