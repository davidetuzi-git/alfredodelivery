-- Create zone_requests table for tracking expansion requests
CREATE TABLE public.zone_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zone_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a zone request (public form)
CREATE POLICY "Anyone can insert zone requests"
ON public.zone_requests FOR INSERT
WITH CHECK (true);

-- Only admins can view all requests
CREATE POLICY "Admins can view zone requests"
ON public.zone_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update requests
CREATE POLICY "Admins can update zone requests"
ON public.zone_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Index for faster queries
CREATE INDEX idx_zone_requests_city ON public.zone_requests(city);
CREATE INDEX idx_zone_requests_status ON public.zone_requests(status);