-- Add alcohol verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alcohol_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alcohol_document_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alcohol_verified_at TIMESTAMP WITH TIME ZONE;