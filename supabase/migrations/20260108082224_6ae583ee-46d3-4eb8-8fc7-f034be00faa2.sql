-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-receipts', 'order-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for receipts bucket
CREATE POLICY "Deliverers can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-receipts' 
  AND EXISTS (
    SELECT 1 FROM deliverers 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Deliverers can view their uploaded receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-receipts' 
  AND EXISTS (
    SELECT 1 FROM deliverers 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-receipts'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add receipt_url column to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ;

-- Function to cleanup old receipts (60 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_receipts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete receipt files older than 60 days
  DELETE FROM storage.objects
  WHERE bucket_id = 'order-receipts'
  AND created_at < NOW() - INTERVAL '60 days';
  
  -- Clear receipt_url from orders older than 60 days
  UPDATE public.orders
  SET receipt_url = NULL, receipt_uploaded_at = NULL
  WHERE receipt_uploaded_at < NOW() - INTERVAL '60 days'
  AND receipt_url IS NOT NULL;
END;
$$;