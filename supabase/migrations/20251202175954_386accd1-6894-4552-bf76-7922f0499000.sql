
-- Create rider compensation configuration table
CREATE TABLE public.rider_compensation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Base compensation
  base_delivery_fee_min NUMERIC NOT NULL DEFAULT 7.00,
  base_delivery_fee_max NUMERIC NOT NULL DEFAULT 10.00,
  picking_fee_per_item NUMERIC NOT NULL DEFAULT 0.15,
  
  -- Distance bonus (beyond 7km)
  distance_bonus_per_km NUMERIC NOT NULL DEFAULT 0.15,
  distance_bonus_threshold_km INTEGER NOT NULL DEFAULT 7,
  
  -- Weather bonus
  weather_bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  weather_bonus_amount NUMERIC NOT NULL DEFAULT 1.50,
  
  -- Peak time settings
  peak_time_multiplier NUMERIC NOT NULL DEFAULT 1.2,
  high_demand_multiplier NUMERIC NOT NULL DEFAULT 1.5,
  
  -- Tips
  rider_tip_percentage INTEGER NOT NULL DEFAULT 80,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create tips table
CREATE TABLE public.order_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  deliverer_id UUID NOT NULL,
  tip_amount NUMERIC NOT NULL,
  rider_share NUMERIC NOT NULL,
  platform_share NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rider earnings table
CREATE TABLE public.rider_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverer_id UUID NOT NULL,
  order_id UUID NOT NULL UNIQUE,
  
  -- Breakdown
  base_fee NUMERIC NOT NULL DEFAULT 0,
  picking_fee NUMERIC NOT NULL DEFAULT 0,
  distance_bonus NUMERIC NOT NULL DEFAULT 0,
  weather_bonus NUMERIC NOT NULL DEFAULT 0,
  peak_bonus NUMERIC NOT NULL DEFAULT 0,
  tip_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Totals
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  
  -- Status
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weekly missions table
CREATE TABLE public.rider_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_deliveries INTEGER,
  target_hours_start TIME,
  target_hours_end TIME,
  bonus_amount NUMERIC NOT NULL,
  bonus_percentage NUMERIC,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rider mission progress table
CREATE TABLE public.rider_mission_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverer_id UUID NOT NULL,
  mission_id UUID NOT NULL REFERENCES rider_missions(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  bonus_paid BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deliverer_id, mission_id)
);

-- Enable RLS
ALTER TABLE public.rider_compensation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_mission_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rider_compensation_config
CREATE POLICY "Admins can manage compensation config"
ON public.rider_compensation_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view compensation config"
ON public.rider_compensation_config FOR SELECT
USING (true);

-- RLS Policies for order_tips
CREATE POLICY "Users can insert tips for their orders"
ON public.order_tips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tips"
ON public.order_tips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Deliverers can view their tips"
ON public.order_tips FOR SELECT
USING (deliverer_id IN (SELECT id FROM deliverers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all tips"
ON public.order_tips FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for rider_earnings
CREATE POLICY "Deliverers can view their own earnings"
ON public.rider_earnings FOR SELECT
USING (deliverer_id IN (SELECT id FROM deliverers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all earnings"
ON public.rider_earnings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert earnings"
ON public.rider_earnings FOR INSERT
WITH CHECK (true);

-- RLS Policies for rider_missions
CREATE POLICY "Anyone can view active missions"
ON public.rider_missions FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage missions"
ON public.rider_missions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for rider_mission_progress
CREATE POLICY "Deliverers can view their mission progress"
ON public.rider_mission_progress FOR SELECT
USING (deliverer_id IN (SELECT id FROM deliverers WHERE user_id = auth.uid()));

CREATE POLICY "System can manage mission progress"
ON public.rider_mission_progress FOR ALL
USING (true);

-- Insert default compensation config
INSERT INTO public.rider_compensation_config (id) VALUES (gen_random_uuid());

-- Add trigger for updated_at
CREATE TRIGGER update_rider_compensation_config_updated_at
BEFORE UPDATE ON public.rider_compensation_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
