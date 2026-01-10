-- Create user_credits table for storing shopping credits
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_in_order_id UUID REFERENCES public.orders(id)
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own credits (for marking as used)
CREATE POLICY "Users can update their own credits"
ON public.user_credits
FOR UPDATE
USING (auth.uid() = user_id);

-- Admin/system can insert credits
CREATE POLICY "System can insert credits"
ON public.user_credits
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_user_credits_expires_at ON public.user_credits(expires_at);
CREATE INDEX idx_user_credits_reminder ON public.user_credits(expires_at, reminder_sent_at) WHERE used_at IS NULL;

-- Add function to get user's available credit balance
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_credits DECIMAL;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
    AND used_at IS NULL
    AND expires_at > now();
  
  RETURN total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;