-- Aggiungi coordinate geografiche alla tabella orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Aggiungi coordinate geografiche e raggio operativo ai deliverers
ALTER TABLE public.deliverers 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS operating_radius_km INTEGER DEFAULT 7;

-- Crea tabella per tracciare le notifiche inviate
CREATE TABLE IF NOT EXISTS public.delivery_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  deliverer_id UUID NOT NULL REFERENCES public.deliverers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, accepted, rejected
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all notifications"
  ON public.delivery_notifications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert notifications"
  ON public.delivery_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update notifications"
  ON public.delivery_notifications
  FOR UPDATE
  TO authenticated
  USING (true);

-- Funzione per calcolare la distanza tra due punti (formula di Haversine)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  R CONSTANT NUMERIC := 6371; -- Raggio della Terra in km
  dLat NUMERIC;
  dLon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
       
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$;