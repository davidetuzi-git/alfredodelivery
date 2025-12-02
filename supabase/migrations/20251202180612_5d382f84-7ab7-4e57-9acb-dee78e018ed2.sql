-- Add new bonus columns to rider_compensation_config
ALTER TABLE public.rider_compensation_config 
ADD COLUMN IF NOT EXISTS first_order_bonus numeric NOT NULL DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS uncovered_zone_bonus numeric NOT NULL DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS rating_bonus_threshold numeric NOT NULL DEFAULT 4.8,
ADD COLUMN IF NOT EXISTS rating_bonus_amount numeric NOT NULL DEFAULT 0.50;