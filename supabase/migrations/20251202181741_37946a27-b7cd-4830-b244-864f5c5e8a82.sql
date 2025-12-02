-- Drop existing policies on deliverer_address_requests
DROP POLICY IF EXISTS "Admins can update address requests" ON public.deliverer_address_requests;
DROP POLICY IF EXISTS "Admins can view all address requests" ON public.deliverer_address_requests;
DROP POLICY IF EXISTS "Deliverers can create address requests" ON public.deliverer_address_requests;
DROP POLICY IF EXISTS "Deliverers can view their own address requests" ON public.deliverer_address_requests;

-- Ensure RLS is enabled
ALTER TABLE public.deliverer_address_requests ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too
ALTER TABLE public.deliverer_address_requests FORCE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies (these grant access)

-- Admins can view all address requests
CREATE POLICY "Admins can view all address requests" 
ON public.deliverer_address_requests 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update address requests
CREATE POLICY "Admins can update address requests" 
ON public.deliverer_address_requests 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Deliverers can view only their own pending address requests
CREATE POLICY "Deliverers can view their own pending requests" 
ON public.deliverer_address_requests 
FOR SELECT 
TO authenticated
USING (
  deliverer_id IN (
    SELECT id FROM public.deliverers WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Deliverers can create their own address requests
CREATE POLICY "Deliverers can create address requests" 
ON public.deliverer_address_requests 
FOR INSERT 
TO authenticated
WITH CHECK (
  deliverer_id IN (
    SELECT id FROM public.deliverers WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);