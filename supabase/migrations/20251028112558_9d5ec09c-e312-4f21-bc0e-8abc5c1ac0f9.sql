-- Add delivery status tracking fields to orders
ALTER TABLE orders 
ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'confirmed',
ADD COLUMN deliverer_id UUID REFERENCES auth.users(id),
ADD COLUMN deliverer_name TEXT,
ADD COLUMN deliverer_phone TEXT,
ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create table for order status history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view status history"
ON order_status_history FOR SELECT
USING (true);

CREATE POLICY "System can insert status history"
ON order_status_history FOR INSERT
WITH CHECK (true);

-- Create chat messages table
CREATE TABLE order_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'deliverer')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE order_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages for their order"
ON order_chat_messages FOR SELECT
USING (true);

CREATE POLICY "Anyone can send messages"
ON order_chat_messages FOR INSERT
WITH CHECK (true);

-- Enable realtime for chat messages
ALTER TABLE order_chat_messages REPLICA IDENTITY FULL;

-- Create function to update status history
CREATE OR REPLACE FUNCTION update_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_status IS DISTINCT FROM OLD.delivery_status THEN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.delivery_status);
    
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
CREATE TRIGGER order_status_change_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_status_history();