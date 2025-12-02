
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.calculate_loyalty_level(monthly_orders INTEGER, has_subscription BOOLEAN)
RETURNS loyalty_level
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF has_subscription THEN
    IF monthly_orders >= 10 THEN
      RETURN 'platinum';
    ELSIF monthly_orders >= 5 THEN
      RETURN 'gold';
    ELSE
      RETURN 'silver';
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

CREATE OR REPLACE FUNCTION public.get_level_discount_percent(level loyalty_level)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
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
