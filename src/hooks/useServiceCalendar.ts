import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';

export interface ServiceCalendarEntry {
  id: string;
  date: string;
  is_blocked: boolean;
  is_holiday: boolean;
  holiday_name: string | null;
  holiday_surcharge: number;
  reason: string | null;
  notification_sent_at: string | null;
  created_at: string;
}

export function useServiceCalendar() {
  const [entries, setEntries] = useState<ServiceCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_calendar')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      setEntries(data as ServiceCalendarEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.some(e => e.date === dateStr && e.is_blocked);
  };

  const isDateHoliday = (date: Date): { isHoliday: boolean; name?: string; surcharge?: number } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === dateStr && e.is_holiday);
    if (entry) {
      return { isHoliday: true, name: entry.holiday_name || undefined, surcharge: entry.holiday_surcharge };
    }
    return { isHoliday: false };
  };

  const getDateInfo = (date: Date): ServiceCalendarEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find(e => e.date === dateStr);
  };

  // Get upcoming blocked dates (next 30 days) that haven't been notified
  const getUpcomingBlockedDates = () => {
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    
    return entries.filter(e => {
      const entryDate = new Date(e.date);
      return e.is_blocked && 
             entryDate >= today && 
             entryDate <= thirtyDaysFromNow;
    });
  };

  // Get upcoming holidays (next 14 days)
  const getUpcomingHolidays = () => {
    const today = new Date();
    const fourteenDaysFromNow = addDays(today, 14);
    
    return entries.filter(e => {
      const entryDate = new Date(e.date);
      return e.is_holiday && 
             !e.is_blocked &&
             entryDate >= today && 
             entryDate <= fourteenDaysFromNow;
    });
  };

  return {
    entries,
    loading,
    isDateBlocked,
    isDateHoliday,
    getDateInfo,
    getUpcomingBlockedDates,
    getUpcomingHolidays,
    refetch: fetchEntries
  };
}

// Admin functions
export async function addBlockedDate(date: Date, reason?: string) {
  const { data, error } = await supabase
    .from('service_calendar')
    .upsert({
      date: format(date, 'yyyy-MM-dd'),
      is_blocked: true,
      reason
    }, { onConflict: 'date' })
    .select()
    .single();

  return { data, error };
}

export async function removeBlockedDate(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check if it's a holiday
  const { data: existing } = await supabase
    .from('service_calendar')
    .select('*')
    .eq('date', dateStr)
    .single();

  if (existing?.is_holiday) {
    // Just update is_blocked to false
    const { error } = await supabase
      .from('service_calendar')
      .update({ is_blocked: false, reason: null })
      .eq('date', dateStr);
    return { error };
  } else {
    // Delete the entry entirely
    const { error } = await supabase
      .from('service_calendar')
      .delete()
      .eq('date', dateStr);
    return { error };
  }
}

export async function markNotificationSent(dates: string[]) {
  const { error } = await supabase
    .from('service_calendar')
    .update({ notification_sent_at: new Date().toISOString() })
    .in('date', dates);
  return { error };
}
