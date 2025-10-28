-- Add deliverer role to enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'deliverer';

-- Function to handle new deliverer registration
CREATE OR REPLACE FUNCTION public.handle_new_deliverer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deliverer_role_exists boolean;
BEGIN
  -- Check if user has deliverer role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role = 'deliverer'
  ) INTO deliverer_role_exists;

  -- If user has deliverer role, create deliverer profile
  IF deliverer_role_exists THEN
    INSERT INTO public.deliverers (
      user_id, 
      name, 
      email, 
      phone,
      status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      'available'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new deliverer users
DROP TRIGGER IF EXISTS on_deliverer_user_created ON auth.users;
CREATE TRIGGER on_deliverer_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_deliverer();

-- Update RLS policies for deliverers table
DROP POLICY IF EXISTS "Deliverers can insert their own profile" ON public.deliverers;
CREATE POLICY "Deliverers can insert their own profile"
  ON public.deliverers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deliverers can update their own profile" ON public.deliverers;
CREATE POLICY "Deliverers can update their own profile"
  ON public.deliverers
  FOR UPDATE
  USING (auth.uid() = user_id);