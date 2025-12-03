-- Create table for unique ad impressions
CREATE TABLE public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ad_id, user_id)
);

-- Create table for ad clicks
CREATE TABLE public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_impressions
CREATE POLICY "System can insert impressions"
ON public.ad_impressions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all impressions"
ON public.ad_impressions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ad_clicks
CREATE POLICY "System can insert clicks"
ON public.ad_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all clicks"
ON public.ad_clicks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_ad_impressions_ad_id ON public.ad_impressions(ad_id);
CREATE INDEX idx_ad_impressions_created_at ON public.ad_impressions(created_at);
CREATE INDEX idx_ad_clicks_ad_id ON public.ad_clicks(ad_id);
CREATE INDEX idx_ad_clicks_created_at ON public.ad_clicks(created_at);