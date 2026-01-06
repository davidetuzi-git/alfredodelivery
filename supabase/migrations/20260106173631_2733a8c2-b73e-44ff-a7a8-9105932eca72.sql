-- Tabella per tracciare le ricerche prezzi per KPI
CREATE TABLE public.price_search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  price_found BOOLEAN NOT NULL DEFAULT false,
  is_estimated BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2),
  price_source TEXT,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per query efficienti
CREATE INDEX idx_price_search_logs_searched_at ON public.price_search_logs(searched_at DESC);
CREATE INDEX idx_price_search_logs_price_found ON public.price_search_logs(price_found);
CREATE INDEX idx_price_search_logs_user_id ON public.price_search_logs(user_id);

-- RLS
ALTER TABLE public.price_search_logs ENABLE ROW LEVEL SECURITY;

-- Solo admin può vedere tutti i log
CREATE POLICY "Admin can view all price search logs"
ON public.price_search_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Sistema può inserire log (service role)
CREATE POLICY "System can insert price search logs"
ON public.price_search_logs
FOR INSERT
WITH CHECK (true);

-- Vista per KPI aggregati
CREATE OR REPLACE VIEW public.price_search_kpi AS
SELECT 
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE price_found = true AND is_estimated = false) as found_real,
  COUNT(*) FILTER (WHERE price_found = true AND is_estimated = true) as found_estimated,
  COUNT(*) FILTER (WHERE price_found = false) as not_found,
  ROUND(
    (COUNT(*) FILTER (WHERE price_found = true AND is_estimated = false)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as trovaprezzi_percentage,
  DATE_TRUNC('day', searched_at) as search_date
FROM public.price_search_logs
GROUP BY DATE_TRUNC('day', searched_at)
ORDER BY search_date DESC;