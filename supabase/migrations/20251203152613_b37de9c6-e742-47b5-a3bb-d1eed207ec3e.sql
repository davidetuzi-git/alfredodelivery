-- Remove policies that allow deliverers to access their own data
DROP POLICY IF EXISTS "Deliverers can view their own profile" ON public.deliverers;
DROP POLICY IF EXISTS "Deliverers can update their own profile" ON public.deliverers;
DROP POLICY IF EXISTS "Deliverers can insert their own profile" ON public.deliverers;

-- Ensure RLS is enabled
ALTER TABLE public.deliverers ENABLE ROW LEVEL SECURITY;

-- Keep only admin policies (they already exist, but recreate to be sure)
DROP POLICY IF EXISTS "Admins can view all deliverers" ON public.deliverers;
DROP POLICY IF EXISTS "Admins can update deliverers" ON public.deliverers;
DROP POLICY IF EXISTS "Admins can insert deliverers" ON public.deliverers;

CREATE POLICY "Admins can view all deliverers" 
ON public.deliverers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deliverers" 
ON public.deliverers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert deliverers" 
ON public.deliverers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete deliverers" 
ON public.deliverers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));