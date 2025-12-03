-- Add policies for deliverers to access only their own data
CREATE POLICY "Deliverers can view their own profile" 
ON public.deliverers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Deliverers can update their own profile" 
ON public.deliverers 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);