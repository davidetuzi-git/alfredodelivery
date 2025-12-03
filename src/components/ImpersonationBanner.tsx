import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUserName, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-4 shadow-lg">
      <Eye className="h-4 w-4" />
      <span className="font-medium">
        Stai visualizzando come: <strong>{impersonatedUserName}</strong>
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExit}
        className="ml-2"
      >
        <X className="h-4 w-4 mr-1" />
        Esci dalla visualizzazione
      </Button>
    </div>
  );
};
