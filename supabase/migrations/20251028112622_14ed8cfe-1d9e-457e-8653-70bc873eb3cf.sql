-- Drop trigger first, then recreate function with proper security settings
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
DROP FUNCTION IF EXISTS update_order_status_history() CASCADE;

CREATE OR REPLACE FUNCTION update_order_status_history()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.delivery_status IS DISTINCT FROM OLD.delivery_status THEN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.delivery_status);
    
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER order_status_change_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_status_history();