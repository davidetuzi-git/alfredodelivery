-- Add telegram_chat_id to profiles for user notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Create table to track scheduled notifications
CREATE TABLE public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'deliverer')),
  recipient_id TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('24h_before', '2h_before', '1h_before', 'shopping_started')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  channels JSONB NOT NULL DEFAULT '["email"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can manage all notifications
CREATE POLICY "Admins can manage scheduled notifications"
ON public.scheduled_notifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for efficient querying of pending notifications
CREATE INDEX idx_scheduled_notifications_pending 
ON public.scheduled_notifications(scheduled_for) 
WHERE sent_at IS NULL;

CREATE INDEX idx_scheduled_notifications_order 
ON public.scheduled_notifications(order_id);