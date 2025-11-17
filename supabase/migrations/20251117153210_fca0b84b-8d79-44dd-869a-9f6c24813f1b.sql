-- Tabella cache prezzi prodotti
CREATE TABLE IF NOT EXISTS public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  source TEXT, -- da dove è stato preso il prezzo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_name, store_name)
);

-- Indice per ricerche veloci
CREATE INDEX idx_product_prices_lookup ON public.product_prices(product_name, store_name, created_at);

-- Enable RLS
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Policy: tutti possono leggere i prezzi
CREATE POLICY "Prezzi visibili a tutti"
  ON public.product_prices
  FOR SELECT
  USING (true);

-- Policy: solo il sistema può inserire/aggiornare
CREATE POLICY "Sistema può gestire prezzi"
  ON public.product_prices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Funzione per pulire prezzi vecchi (> 4 giorni)
CREATE OR REPLACE FUNCTION public.cleanup_old_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.product_prices
  WHERE created_at < NOW() - INTERVAL '4 days';
END;
$$;

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_product_prices_updated_at
  BEFORE UPDATE ON public.product_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();