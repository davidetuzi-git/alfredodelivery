-- Allow admins to view all communication preferences
CREATE POLICY "Admins can view all communication preferences"
ON public.communication_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all saved addresses
CREATE POLICY "Admins can view all saved addresses"
ON public.saved_addresses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all saved payment methods
CREATE POLICY "Admins can view all saved payment methods"
ON public.saved_payment_methods
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all saved shopping lists
CREATE POLICY "Admins can view all saved shopping lists"
ON public.saved_shopping_lists
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user notifications
CREATE POLICY "Admins can view all user notifications"
ON public.user_notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));