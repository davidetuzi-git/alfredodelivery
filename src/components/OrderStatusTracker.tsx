import { CheckCircle2, Circle, Truck, ShoppingCart, PackageCheck, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface StatusHistoryItem {
  status: string;
  created_at: string;
}

interface OrderStatusTrackerProps {
  currentStatus: string;
  statusHistory?: StatusHistoryItem[];
}

const OrderStatusTracker = ({ currentStatus, statusHistory = [] }: OrderStatusTrackerProps) => {
  const statuses = [
    { id: 'confirmed', label: 'Spesa confermata', icon: CheckCircle2 },
    { id: 'assigned', label: 'Deliverer ha preso in carico', icon: Truck },
    { id: 'at_store', label: 'Raggiunto supermercato', icon: ShoppingCart },
    { id: 'shopping_complete', label: 'Spesa completata', icon: PackageCheck },
    { id: 'on_the_way', label: 'Sta arrivando', icon: Truck },
    { id: 'delivered', label: 'Consegnato', icon: Home },
  ];

  const currentIndex = statuses.findIndex(s => s.id === currentStatus);

  // Create a map from status to timestamp
  const statusTimestamps: Record<string, string> = {};
  statusHistory.forEach(item => {
    statusTimestamps[item.status] = item.created_at;
  });

  return (
    <div className="relative py-8">
      {/* Progress line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
      <div 
        className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
        style={{ height: `${(currentIndex / (statuses.length - 1)) * 100}%` }}
      />

      {/* Status steps */}
      <div className="space-y-8">
        {statuses.map((status, index) => {
          const Icon = status.icon;
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const timestamp = statusTimestamps[status.id];

          return (
            <div key={status.id} className="relative flex items-center gap-4">
              {/* Icon circle */}
              <div
                className={cn(
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 flex-shrink-0",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground shadow-lg"
                    : "border-muted bg-background text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20 scale-110"
                )}
              >
                <Icon className={cn("h-6 w-6", isCurrent && "animate-pulse")} />
              </div>

              {/* Label and timestamp */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold transition-colors",
                    isCompleted ? "text-foreground" : "text-muted-foreground",
                    isCurrent && "text-primary"
                  )}
                >
                  {status.label}
                </p>
                {isCompleted && timestamp && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(timestamp), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatusTracker;
