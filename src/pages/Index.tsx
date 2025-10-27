import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Benefits } from "@/components/Benefits";
import { CallToAction } from "@/components/CallToAction";
import { Footer } from "@/components/Footer";

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
    </div>
  );
};

export default Index;
