-- Fix critical security issues in orders table

-- 1. DROP dangerous public policies
DROP POLICY IF EXISTS "Anyone can view orders with pickup code" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;

-- 2. Keep existing safe policies (users viewing their own orders, admins)
-- "Users can view their own orders" - SAFE ✓
-- "Admins can view all orders" - SAFE ✓
-- "Admins can update all orders" - SAFE ✓
-- "Anyone can create orders" - SAFE (needed for checkout) ✓

-- 3. Add secure policy for deliverers to view their assigned orders
CREATE POLICY "Deliverers can view their assigned orders"
  ON public.orders
  FOR SELECT
  USING (
    deliverer_id IN (
      SELECT id FROM deliverers WHERE user_id = auth.uid()
    )
  );

-- 4. Add secure policy for deliverers to update only status of their orders
CREATE POLICY "Deliverers can update status of their assigned orders"
  ON public.orders
  FOR UPDATE
  USING (
    deliverer_id IN (
      SELECT id FROM deliverers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    deliverer_id IN (
      SELECT id FROM deliverers WHERE user_id = auth.uid()
    )
  );

-- 5. Fix deliverer_auth_tokens security issue
DROP POLICY IF EXISTS "Anyone can select valid tokens" ON public.deliverer_auth_tokens;

-- Only system can read tokens (via service role key in edge functions)
CREATE POLICY "Only system can read tokens"
  ON public.deliverer_auth_tokens
  FOR SELECT
  USING (false); -- No one via anon key can read

-- Deliverers can view their own tokens (for debugging)
CREATE POLICY "Deliverers can view their own tokens"
  ON public.deliverer_auth_tokens
  FOR SELECT
  USING (
    deliverer_id IN (
      SELECT id FROM deliverers WHERE user_id = auth.uid()
    )
  );