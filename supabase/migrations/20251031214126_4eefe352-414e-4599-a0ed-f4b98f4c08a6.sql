-- Delete orders without user_id (anonymous orders from before authentication was required)
DELETE FROM orders WHERE user_id IS NULL;

-- Make user_id required for orders
ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;

-- Drop the insecure "Anyone can create orders" policy
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

-- Create secure policy: only authenticated users can create orders
CREATE POLICY "Authenticated users can create their own orders"
ON orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);