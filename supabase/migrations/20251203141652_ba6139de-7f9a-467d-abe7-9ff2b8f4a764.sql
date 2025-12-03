-- Create table for blocked/unavailable dates and holidays
CREATE TABLE public.service_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_holiday BOOLEAN NOT NULL DEFAULT false,
  holiday_name TEXT,
  holiday_surcharge NUMERIC NOT NULL DEFAULT 10.00,
  reason TEXT,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_calendar ENABLE ROW LEVEL SECURITY;

-- Everyone can view calendar dates
CREATE POLICY "Anyone can view service calendar"
ON public.service_calendar
FOR SELECT
USING (true);

-- Only admins can manage calendar
CREATE POLICY "Admins can manage service calendar"
ON public.service_calendar
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert Italian national holidays for 2025
INSERT INTO public.service_calendar (date, is_holiday, holiday_name, holiday_surcharge) VALUES
('2025-01-01', true, 'Capodanno', 10.00),
('2025-01-06', true, 'Epifania', 10.00),
('2025-04-20', true, 'Pasqua', 10.00),
('2025-04-21', true, 'Lunedì dell''Angelo', 10.00),
('2025-04-25', true, 'Festa della Liberazione', 10.00),
('2025-05-01', true, 'Festa dei Lavoratori', 10.00),
('2025-06-02', true, 'Festa della Repubblica', 10.00),
('2025-08-15', true, 'Ferragosto', 10.00),
('2025-11-01', true, 'Tutti i Santi', 10.00),
('2025-12-08', true, 'Immacolata Concezione', 10.00),
('2025-12-25', true, 'Natale', 10.00),
('2025-12-26', true, 'Santo Stefano', 10.00);

-- Add trigger for updated_at
CREATE TRIGGER update_service_calendar_updated_at
BEFORE UPDATE ON public.service_calendar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();