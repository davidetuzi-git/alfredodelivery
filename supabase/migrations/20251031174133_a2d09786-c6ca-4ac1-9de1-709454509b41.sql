-- Add user_id column to orders table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

-- Add RLS policy for users to view their own orders
CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
USING (auth.uid() = user_id);