-- Create ad slots table (available positions on the platform)
CREATE TABLE public.ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  location text NOT NULL, -- e.g., 'sidebar', 'mobile_banner', 'home_hero'
  dimensions text, -- e.g., '300x250', '728x90'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create advertisements table
CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_name text NOT NULL UNIQUE,
  client_name text NOT NULL,
  description text,
  link_url text NOT NULL,
  image_url text,
  slot_id uuid REFERENCES public.ad_slots(id) ON DELETE SET NULL,
  payment_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- RLS policies for ad_slots
CREATE POLICY "Admins can manage ad slots"
ON public.ad_slots
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view ad slots"
ON public.ad_slots
FOR SELECT
USING (true);

-- RLS policies for advertisements
CREATE POLICY "Admins can manage advertisements"
ON public.advertisements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active advertisements"
ON public.advertisements
FOR SELECT
USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Insert default ad slots
INSERT INTO public.ad_slots (name, description, location, dimensions) VALUES
('Sidebar Desktop 1', 'Prima posizione sidebar desktop', 'sidebar', '300x250'),
('Sidebar Desktop 2', 'Seconda posizione sidebar desktop', 'sidebar', '300x250'),
('Sidebar Desktop 3', 'Terza posizione sidebar desktop', 'sidebar', '300x250'),
('Banner Mobile Top', 'Banner orizzontale mobile in alto', 'mobile_banner', '320x100'),
('Banner Mobile Bottom', 'Banner orizzontale mobile in basso', 'mobile_banner', '320x100'),
('Hero Home', 'Banner principale homepage', 'home_hero', '1200x400'),
('Checkout Banner', 'Banner nella pagina checkout', 'checkout', '728x90');

-- Create trigger for updated_at
CREATE TRIGGER update_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();