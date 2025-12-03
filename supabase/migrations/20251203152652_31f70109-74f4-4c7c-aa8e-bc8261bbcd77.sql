-- Remove policies that allow users to access their own requests
DROP POLICY IF EXISTS "Users can insert own requests" ON public.deliverer_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.deliverer_requests;

-- Ensure RLS is enabled
ALTER TABLE public.deliverer_requests ENABLE ROW LEVEL SECURITY;

-- Recreate admin-only policies
DROP POLICY IF EXISTS "Admins can view all requests" ON public.deliverer_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.deliverer_requests;

CREATE POLICY "Admins can view all requests" 
ON public.deliverer_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests" 
ON public.deliverer_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert requests" 
ON public.deliverer_requests 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete requests" 
ON public.deliverer_requests 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));