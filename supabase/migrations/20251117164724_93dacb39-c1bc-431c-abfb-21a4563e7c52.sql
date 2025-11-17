-- Add preferred_store column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_store TEXT;