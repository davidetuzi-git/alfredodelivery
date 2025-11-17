-- Modifico la tabella product_prices per includere l'indirizzo specifico
ALTER TABLE public.product_prices 
  DROP CONSTRAINT IF EXISTS product_prices_product_name_store_name_key;

ALTER TABLE public.product_prices
  ADD COLUMN IF NOT EXISTS store_address TEXT;

-- Nuovo indice univoco con indirizzo
CREATE UNIQUE INDEX IF NOT EXISTS product_prices_unique_location 
  ON public.product_prices(product_name, store_name, store_address);

-- Tabella per notifiche admin urgenti
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, read, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: solo admin possono vedere e gestire notifiche
CREATE POLICY "Admin can view notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: sistema può creare notifiche
CREATE POLICY "System can create notifications"
  ON public.admin_notifications
  FOR INSERT
  WITH CHECK (true);

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status 
  ON public.admin_notifications(status, created_at DESC);