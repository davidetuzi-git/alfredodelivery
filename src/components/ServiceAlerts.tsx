import { useServiceCalendar } from "@/hooks/useServiceCalendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarOff, PartyPopper, AlertTriangle } from "lucide-react";

export function ServiceAlerts() {
  const { getUpcomingBlockedDates, getUpcomingHolidays, loading } = useServiceCalendar();

  if (loading) return null;

  const blockedDates = getUpcomingBlockedDates();
  const upcomingHolidays = getUpcomingHolidays();

  if (blockedDates.length === 0 && upcomingHolidays.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Blocked Dates Alert */}
      {blockedDates.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <CalendarOff className="h-5 w-5" />
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Servizio Non Disponibile
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">Il servizio di consegna non sarà disponibile nelle seguenti date:</p>
            <div className="flex flex-wrap gap-2">
              {blockedDates.map((entry) => (
                <Badge 
                  key={entry.id} 
                  variant="destructive"
                  className="text-sm"
                >
                  {format(new Date(entry.date), "EEEE d MMMM", { locale: it })}
                  {entry.reason && ` - ${entry.reason}`}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Holiday Surcharge Alert */}
      {upcomingHolidays.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
          <PartyPopper className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Prossime Festività
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p className="mb-2">
              Per le consegne durante le festività nazionali è previsto un supplemento di €10:
            </p>
            <div className="flex flex-wrap gap-2">
              {upcomingHolidays.map((entry) => (
                <Badge 
                  key={entry.id}
                  className="bg-amber-200 text-amber-900 hover:bg-amber-300"
                >
                  {format(new Date(entry.date), "d MMMM", { locale: it })} - {entry.holiday_name}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
