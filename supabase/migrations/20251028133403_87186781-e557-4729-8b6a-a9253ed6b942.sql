-- Crea tabella per le richieste di registrazione fattorini
CREATE TABLE IF NOT EXISTS public.deliverer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.deliverer_requests ENABLE ROW LEVEL SECURITY;

-- Policy per vedere le proprie richieste
CREATE POLICY "Users can view their own requests"
ON public.deliverer_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy per inserire richieste
CREATE POLICY "Authenticated users can insert requests"
ON public.deliverer_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Policy per admin per vedere tutte le richieste
CREATE POLICY "Admins can view all requests"
ON public.deliverer_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy per admin per aggiornare richieste
CREATE POLICY "Admins can update requests"
ON public.deliverer_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger per updated_at
CREATE TRIGGER update_deliverer_requests_updated_at
  BEFORE UPDATE ON public.deliverer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Modifica trigger per creare deliverer solo se approvato
DROP TRIGGER IF EXISTS on_deliverer_user_created ON auth.users;

-- Crea funzione per gestire approvazione
CREATE OR REPLACE FUNCTION public.approve_deliverer_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request deliverer_requests%ROWTYPE;
BEGIN
  -- Ottieni i dati della richiesta
  SELECT * INTO v_request
  FROM deliverer_requests
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Aggiorna lo stato della richiesta
  UPDATE deliverer_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = request_id;

  -- Aggiungi ruolo deliverer
  INSERT INTO user_roles (user_id, role)
  VALUES (v_request.user_id, 'deliverer')
  ON CONFLICT DO NOTHING;

  -- Crea profilo deliverer
  INSERT INTO deliverers (
    user_id,
    name,
    email,
    phone,
    status
  ) VALUES (
    v_request.user_id,
    v_request.name,
    v_request.email,
    v_request.phone,
    'available'
  );
END;
$$;