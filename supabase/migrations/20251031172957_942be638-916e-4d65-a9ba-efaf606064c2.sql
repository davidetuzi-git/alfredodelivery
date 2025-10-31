-- Add base_address field to deliverers table
ALTER TABLE deliverers ADD COLUMN IF NOT EXISTS base_address TEXT;

-- Create table for address change requests
CREATE TABLE IF NOT EXISTS deliverer_address_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverer_id UUID NOT NULL REFERENCES deliverers(id) ON DELETE CASCADE,
  requested_address TEXT NOT NULL,
  requested_latitude NUMERIC NOT NULL,
  requested_longitude NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE deliverer_address_requests ENABLE ROW LEVEL SECURITY;

-- Deliverers can view their own requests
CREATE POLICY "Deliverers can view their own address requests"
ON deliverer_address_requests
FOR SELECT
USING (
  deliverer_id IN (
    SELECT id FROM deliverers WHERE user_id = auth.uid()
  )
);

-- Deliverers can insert their own requests
CREATE POLICY "Deliverers can create address requests"
ON deliverer_address_requests
FOR INSERT
WITH CHECK (
  deliverer_id IN (
    SELECT id FROM deliverers WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Admins can view all requests
CREATE POLICY "Admins can view all address requests"
ON deliverer_address_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update address requests"
ON deliverer_address_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger to update deliverers table when request is approved
CREATE OR REPLACE FUNCTION handle_address_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE deliverers
    SET 
      base_address = NEW.requested_address,
      latitude = NEW.requested_latitude,
      longitude = NEW.requested_longitude
    WHERE id = NEW.deliverer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_address_request_approved
  AFTER UPDATE ON deliverer_address_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION handle_address_request_approval();