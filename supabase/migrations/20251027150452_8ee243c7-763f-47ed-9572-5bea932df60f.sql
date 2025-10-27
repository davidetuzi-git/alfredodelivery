-- Fix search path for existing functions
ALTER FUNCTION public.generate_pickup_code() SET search_path = public;