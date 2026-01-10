-- Fix the permissive insert policy for user_credits
DROP POLICY IF EXISTS "System can insert credits" ON public.user_credits;

-- Create proper insert policy - allow authenticated users or service role
CREATE POLICY "Service role can insert credits"
ON public.user_credits
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Fix the function search path
DROP FUNCTION IF EXISTS public.get_user_credit_balance(UUID);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;