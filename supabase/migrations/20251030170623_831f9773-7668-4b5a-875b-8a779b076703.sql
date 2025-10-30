-- Add avatar_url and rating fields to deliverers table
ALTER TABLE public.deliverers 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_time_deliveries INTEGER DEFAULT 0;

-- Create storage bucket for deliverer avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverer-avatars', 'deliverer-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for deliverer avatars
CREATE POLICY "Deliverer avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'deliverer-avatars');

CREATE POLICY "Deliverers can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deliverer-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Deliverers can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'deliverer-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Deliverers can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deliverer-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);