-- Drop the public SELECT policy that exposes feedback data
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.order_feedback;

-- Create new restricted SELECT policy for order owners
CREATE POLICY "Order owners can view feedback for their orders"
ON public.order_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_feedback.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Create policy for deliverers to view feedback about themselves
CREATE POLICY "Deliverers can view their own feedback"
ON public.order_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deliverers
    WHERE deliverers.id = order_feedback.deliverer_id
    AND deliverers.user_id = auth.uid()
  )
);

-- Create policy for admins to view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.order_feedback
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);