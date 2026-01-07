-- Create table to persist checkout payload across Stripe redirects
CREATE TABLE IF NOT EXISTS public.pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage only their own pending orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pending_orders' AND policyname = 'Users can insert their own pending orders'
  ) THEN
    CREATE POLICY "Users can insert their own pending orders"
    ON public.pending_orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pending_orders' AND policyname = 'Users can view their own pending orders'
  ) THEN
    CREATE POLICY "Users can view their own pending orders"
    ON public.pending_orders
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pending_orders' AND policyname = 'Users can delete their own pending orders'
  ) THEN
    CREATE POLICY "Users can delete their own pending orders"
    ON public.pending_orders
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_created_at
ON public.pending_orders (user_id, created_at DESC);
