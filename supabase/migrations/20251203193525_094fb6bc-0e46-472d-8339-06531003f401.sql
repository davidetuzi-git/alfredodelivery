-- Create table for user store loyalty cards
CREATE TABLE public.store_loyalty_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_chain TEXT NOT NULL,
  barcode TEXT NOT NULL,
  card_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_loyalty_cards ENABLE ROW LEVEL SECURITY;

-- Users can manage their own cards
CREATE POLICY "Users can view their own loyalty cards"
ON public.store_loyalty_cards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loyalty cards"
ON public.store_loyalty_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loyalty cards"
ON public.store_loyalty_cards
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loyalty cards"
ON public.store_loyalty_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all cards
CREATE POLICY "Admins can view all loyalty cards"
ON public.store_loyalty_cards
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add loyalty_card_barcode column to orders table for deliverer reference
ALTER TABLE public.orders ADD COLUMN loyalty_card_barcode TEXT;
ALTER TABLE public.orders ADD COLUMN loyalty_card_used BOOLEAN DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_store_loyalty_cards_updated_at
BEFORE UPDATE ON public.store_loyalty_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();