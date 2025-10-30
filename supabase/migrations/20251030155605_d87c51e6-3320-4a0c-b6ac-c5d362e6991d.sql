
-- Create table for one-time authentication tokens
CREATE TABLE IF NOT EXISTS public.deliverer_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverer_id uuid NOT NULL REFERENCES public.deliverers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  notification_id uuid REFERENCES public.delivery_notifications(id) ON DELETE CASCADE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deliverer_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create index on token for fast lookup
CREATE INDEX idx_deliverer_auth_tokens_token ON public.deliverer_auth_tokens(token);
CREATE INDEX idx_deliverer_auth_tokens_expires ON public.deliverer_auth_tokens(expires_at);

-- Policy: Anyone can select valid tokens (for authentication)
CREATE POLICY "Anyone can select valid tokens" ON public.deliverer_auth_tokens
  FOR SELECT USING (
    expires_at > now() AND used_at IS NULL
  );

-- Policy: System can insert tokens
CREATE POLICY "System can insert tokens" ON public.deliverer_auth_tokens
  FOR INSERT WITH CHECK (true);

-- Policy: System can update tokens
CREATE POLICY "System can update tokens" ON public.deliverer_auth_tokens
  FOR UPDATE USING (true);
