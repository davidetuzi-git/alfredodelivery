import { useState } from "react";
import { format, isToday, isTomorrow, differenceInDays, startOfDay, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarIcon, Sparkles, Clock, TrendingDown, AlertTriangle } from "lucide-react";
import { calculateSchedulingAdjustment, SuggestedDate } from "@/hooks/useSchedulingPricing";

interface DeliveryDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  suggestedDates?: SuggestedDate[];
  hasError?: boolean;
  disabled?: boolean;
}

const DeliveryDatePicker = ({
  value,
  onChange,
  suggestedDates = [],
  hasError = false,
  disabled = false
}: DeliveryDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const currentHour = now.getHours();

  // Get adjustment for selected date
  const selectedAdjustment = value ? calculateSchedulingAdjustment(value) : null;
  
  // Check if selected date has extra discount from nearby orders
  const selectedSuggestion = value 
    ? suggestedDates.find(s => isSameDay(s.date, value))
    : null;

  // Get label color based on adjustment type
  const getAdjustmentColor = (amount: number) => {
    if (amount > 0) return "text-red-600 dark:text-red-400";
    if (amount < 0) return "text-green-600 dark:text-green-400";
    return "text-muted-foreground";
  };

  // Custom day content to show pricing adjustments
  const renderDayContent = (day: Date) => {
    const adjustment = calculateSchedulingAdjustment(day);
    const suggestion = suggestedDates.find(s => isSameDay(s.date, day));
    const isPast = day < startOfDay(now);
    
    if (isPast) {
      return <span>{day.getDate()}</span>;
    }

    return (
      <div className="relative flex flex-col items-center">
        <span>{day.getDate()}</span>
        {adjustment && (
          <span 
            className={cn(
              "text-[9px] font-medium leading-tight",
              adjustment.type === 'surcharge' 
                ? "text-red-500 dark:text-red-400" 
                : "text-green-500 dark:text-green-400"
            )}
          >
            {adjustment.label}
          </span>
        )}
        {suggestion && (
          <span className="absolute -top-1 -right-1">
            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              hasError && "border-destructive animate-shake"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: it }) : "Seleziona una data"}
            {selectedAdjustment && (
              <Badge 
                variant={selectedAdjustment.type === 'surcharge' ? "destructive" : "default"}
                className={cn(
                  "ml-auto text-xs",
                  selectedAdjustment.type === 'discount' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900"
                )}
              >
                {selectedAdjustment.label}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b bg-muted/50">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              Pianifica e risparmia
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Oggi (urgente)</span>
                <span className="text-red-500 font-medium">+€5,00</span>
              </div>
              <div className="flex justify-between">
                <span>Domani {currentHour < 11 ? "(entro le 11)" : currentHour < 17 ? "(entro le 17)" : ""}</span>
                <span className="text-green-500 font-medium">
                  {currentHour < 11 ? "-€0,80" : currentHour < 17 ? "-€0,50" : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>+2 giorni</span>
                <span className="text-green-500 font-medium">-€1,00</span>
              </div>
              <div className="flex justify-between">
                <span>+3 giorni</span>
                <span className="text-green-500 font-medium">-€1,50</span>
              </div>
              <div className="flex justify-between">
                <span>+5 giorni</span>
                <span className="text-green-500 font-medium">-€3,00</span>
              </div>
            </div>
          </div>

          {suggestedDates.length > 0 && (
            <div className="p-3 border-b bg-amber-50 dark:bg-amber-950/50">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Sparkles className="h-4 w-4" />
                Date consigliate
              </h4>
              <div className="space-y-2">
                {suggestedDates.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onChange(suggestion.date);
                      setOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-md bg-white dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {format(suggestion.date, "EEEE d MMMM", { locale: it })}
                      </span>
                      <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs">
                        Extra -€{suggestion.extraDiscount.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suggestion.reason}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            disabled={(date) => date < startOfDay(now)}
            initialFocus
            className="pointer-events-auto"
            components={{
              DayContent: ({ date }) => renderDayContent(date)
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Show adjustment details below picker */}
      {value && (selectedAdjustment || selectedSuggestion) && (
        <div className={cn(
          "p-3 rounded-lg border text-sm",
          selectedAdjustment?.type === 'surcharge' 
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
        )}>
          {selectedAdjustment?.type === 'surcharge' ? (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">
                  Supplemento urgenza: {selectedAdjustment.label}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {selectedAdjustment.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  Sconto programmazione: {selectedAdjustment?.label || ''}
                  {selectedSuggestion && selectedAdjustment && ' + '}
                  {selectedSuggestion && `Extra -€${selectedSuggestion.extraDiscount.toFixed(2)}`}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {selectedAdjustment?.description}
                  {selectedSuggestion && (
                    <>
                      <br />
                      <span className="flex items-center gap-1 mt-1">
                        <Sparkles className="h-3 w-3" />
                        {selectedSuggestion.reason}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryDatePicker;
