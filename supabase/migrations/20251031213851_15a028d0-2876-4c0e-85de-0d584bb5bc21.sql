-- Drop existing insecure policies
DROP POLICY IF EXISTS "Anyone can view messages for their order" ON order_chat_messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON order_chat_messages;

-- Create secure policy for viewing messages
-- Users can view messages if they are:
-- 1. The customer who owns the order
-- 2. The deliverer assigned to the order
-- 3. An admin
CREATE POLICY "Users can view messages for their orders"
ON order_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_chat_messages.order_id
    AND (
      -- Customer who created the order
      orders.user_id = auth.uid()
      -- Deliverer assigned to the order
      OR EXISTS (
        SELECT 1 FROM deliverers
        WHERE deliverers.id = orders.deliverer_id
        AND deliverers.user_id = auth.uid()
      )
      -- Admin users
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Create secure policy for sending messages
-- Users can send messages if they are:
-- 1. The customer who owns the order
-- 2. The deliverer assigned to the order
CREATE POLICY "Users can send messages for their orders"
ON order_chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_chat_messages.order_id
    AND (
      -- Customer who created the order
      orders.user_id = auth.uid()
      -- Deliverer assigned to the order
      OR EXISTS (
        SELECT 1 FROM deliverers
        WHERE deliverers.id = orders.deliverer_id
        AND deliverers.user_id = auth.uid()
      )
    )
  )
);