-- Add email field to deliverers table
ALTER TABLE public.deliverers
ADD COLUMN email text;

COMMENT ON COLUMN public.deliverers.email IS 'Email address for notifications';