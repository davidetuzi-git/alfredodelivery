-- Create order_feedback table
CREATE TABLE IF NOT EXISTS public.order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  deliverer_id UUID NOT NULL REFERENCES public.deliverers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can insert feedback for their order"
ON public.order_feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view feedback"
ON public.order_feedback FOR SELECT
USING (true);

-- Function to update deliverer rating when feedback is added
CREATE OR REPLACE FUNCTION public.update_deliverer_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
  total_count INTEGER;
BEGIN
  -- Calculate new average rating for the deliverer
  SELECT 
    AVG(rating)::NUMERIC(3,2),
    COUNT(*)
  INTO avg_rating, total_count
  FROM order_feedback
  WHERE deliverer_id = NEW.deliverer_id;
  
  -- Update deliverer stats
  UPDATE deliverers
  SET 
    rating = avg_rating,
    total_deliveries = total_count
  WHERE id = NEW.deliverer_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update deliverer rating after feedback
CREATE TRIGGER update_deliverer_rating_trigger
AFTER INSERT ON public.order_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_deliverer_rating();