-- Drop existing policies on deliverer_requests
DROP POLICY IF EXISTS "Admins can update requests" ON public.deliverer_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.deliverer_requests;
DROP POLICY IF EXISTS "Authenticated users can insert requests" ON public.deliverer_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.deliverer_requests;

-- Ensure RLS is enabled and forced
ALTER TABLE public.deliverer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverer_requests FORCE ROW LEVEL SECURITY;

-- Create secure PERMISSIVE policies

-- Admins can view all requests
CREATE POLICY "Admins can view all requests" 
ON public.deliverer_requests 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update requests" 
ON public.deliverer_requests 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view only their own requests
CREATE POLICY "Users can view own requests" 
ON public.deliverer_requests 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert their own requests
CREATE POLICY "Users can insert own requests" 
ON public.deliverer_requests 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');