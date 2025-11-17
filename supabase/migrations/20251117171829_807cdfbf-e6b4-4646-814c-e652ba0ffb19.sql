-- Drop the public SELECT policy that exposes order tracking data
DROP POLICY IF EXISTS "Anyone can view status history" ON public.order_status_history;

-- Create policy for order owners to view their order history
CREATE POLICY "Order owners can view their order status history"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_status_history.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Create policy for deliverers to view status of their assigned orders
CREATE POLICY "Deliverers can view status of their assigned orders"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    INNER JOIN public.deliverers ON deliverers.id = orders.deliverer_id
    WHERE orders.id = order_status_history.order_id
    AND deliverers.user_id = auth.uid()
  )
);

-- Create policy for admins to view all order status history
CREATE POLICY "Admins can view all order status history"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);