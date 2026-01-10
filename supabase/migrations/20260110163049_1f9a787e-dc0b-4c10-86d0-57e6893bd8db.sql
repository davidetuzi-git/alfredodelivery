-- Create cancellation_requests table for order cancellation workflow
CREATE TABLE public.cancellation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own cancellation requests
CREATE POLICY "Users can view their own cancellation requests"
ON public.cancellation_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own cancellation requests
CREATE POLICY "Users can create cancellation requests"
ON public.cancellation_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all cancellation requests
CREATE POLICY "Admins can view all cancellation requests"
ON public.cancellation_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update cancellation requests
CREATE POLICY "Admins can update cancellation requests"
ON public.cancellation_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_cancellation_requests_updated_at
BEFORE UPDATE ON public.cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_cancellation_requests_order_id ON public.cancellation_requests(order_id);
CREATE INDEX idx_cancellation_requests_status ON public.cancellation_requests(status);