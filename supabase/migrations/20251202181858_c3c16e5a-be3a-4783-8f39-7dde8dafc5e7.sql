-- Add document_url column to deliverer_requests
ALTER TABLE public.deliverer_requests 
ADD COLUMN document_url text,
ADD COLUMN document_type text;

-- Create private storage bucket for deliverer documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverer-documents', 'deliverer-documents', false);

-- RLS policies for deliverer-documents bucket

-- Users can upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deliverer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliverer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all deliverer documents
CREATE POLICY "Admins can view all deliverer documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliverer-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admins can delete deliverer documents
CREATE POLICY "Admins can delete deliverer documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deliverer-documents'
  AND public.has_role(auth.uid(), 'admin')
);