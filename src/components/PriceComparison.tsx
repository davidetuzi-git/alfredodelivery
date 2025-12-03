import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";

interface PriceComparisonProps {
  items: Array<{ name: string; price: number | null; quantity: number }>;
  currentStore: string;
  nearbyStores?: string[];
}

const PriceComparison = ({ items, currentStore, nearbyStores = [] }: PriceComparisonProps) => {
  const navigate = useNavigate();

  const handleCompare = () => {
    navigate("/confronta", { 
      state: { 
        items: items.filter(item => item.name.trim() !== ""),
        currentStore,
        nearbyStores 
      } 
    });
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleCompare}>
      <Scale className="h-4 w-4 mr-2" />
      Confronta prezzi con altro supermercato
    </Button>
  );
};

export default PriceComparison;
