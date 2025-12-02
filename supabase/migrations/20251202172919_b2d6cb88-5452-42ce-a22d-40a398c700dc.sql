
-- Create loyalty levels enum
CREATE TYPE loyalty_level AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Create loyalty_profiles table
CREATE TABLE public.loyalty_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  current_level loyalty_level NOT NULL DEFAULT 'bronze',
  monthly_orders_count INTEGER NOT NULL DEFAULT 0,
  monthly_orders_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  referral_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create points_transactions table for tracking
CREATE TABLE public.points_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earned', 'spent', 'referral_bonus', 'welcome_bonus', 'cashback'
  description TEXT,
  order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_uses table
CREATE TABLE public.referral_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE, -- Each user can only be referred once
  referrer_bonus_applied BOOLEAN NOT NULL DEFAULT false,
  referred_bonus_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_profiles
CREATE POLICY "Users can view their own loyalty profile"
ON public.loyalty_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own loyalty profile"
ON public.loyalty_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert loyalty profiles"
ON public.loyalty_profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all loyalty profiles"
ON public.loyalty_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all loyalty profiles"
ON public.loyalty_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for points_transactions
CREATE POLICY "Users can view their own transactions"
ON public.points_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
ON public.points_transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all transactions"
ON public.points_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_uses
CREATE POLICY "Users can view referrals they made"
ON public.referral_uses FOR SELECT
USING (auth.uid() = referrer_user_id);

CREATE POLICY "System can manage referrals"
ON public.referral_uses FOR ALL
USING (true)
WITH CHECK (true);

-- Function to create loyalty profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_loyalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.loyalty_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create loyalty profile when user profile is created
CREATE TRIGGER on_profile_created_create_loyalty
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_loyalty();

-- Function to calculate loyalty level based on monthly orders
CREATE OR REPLACE FUNCTION public.calculate_loyalty_level(monthly_orders INTEGER, has_subscription BOOLEAN)
RETURNS loyalty_level
LANGUAGE plpgsql
AS $$
BEGIN
  -- Subscribers get automatic upgrade
  IF has_subscription THEN
    IF monthly_orders >= 10 THEN
      RETURN 'platinum';
    ELSIF monthly_orders >= 5 THEN
      RETURN 'gold';
    ELSE
      RETURN 'silver'; -- Minimum silver for subscribers
    END IF;
  ELSE
    IF monthly_orders >= 10 THEN
      RETURN 'gold';
    ELSIF monthly_orders >= 5 THEN
      RETURN 'silver';
    ELSE
      RETURN 'bronze';
    END IF;
  END IF;
END;
$$;

-- Function to get delivery discount percentage by level
CREATE OR REPLACE FUNCTION public.get_level_discount_percent(level loyalty_level)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  CASE level
    WHEN 'platinum' THEN RETURN 15;
    WHEN 'gold' THEN RETURN 10;
    WHEN 'silver' THEN RETURN 5;
    ELSE RETURN 0;
  END CASE;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_loyalty_profiles_updated_at
BEFORE UPDATE ON public.loyalty_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
