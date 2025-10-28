-- Aggiungi policy per permettere agli utenti di inserire il proprio ruolo deliverer
CREATE POLICY "Users can insert their own deliverer role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'deliverer'
);