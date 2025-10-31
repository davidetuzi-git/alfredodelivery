-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Policies for vouchers
CREATE POLICY "Anyone can view active vouchers"
  ON public.vouchers
  FOR SELECT
  USING (active = true AND valid_from <= NOW() AND valid_until >= NOW());

CREATE POLICY "Admins can view all vouchers"
  ON public.vouchers
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert vouchers"
  ON public.vouchers
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update vouchers"
  ON public.vouchers
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete vouchers"
  ON public.vouchers
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create voucher_uses table to track usage
CREATE TABLE public.voucher_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID REFERENCES auth.users(id),
  discount_applied NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on voucher_uses
ALTER TABLE public.voucher_uses ENABLE ROW LEVEL SECURITY;

-- Policies for voucher_uses
CREATE POLICY "Users can view their own voucher uses"
  ON public.voucher_uses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all voucher uses"
  ON public.voucher_uses
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert voucher uses"
  ON public.voucher_uses
  FOR INSERT
  WITH CHECK (true);

-- Add voucher_code column to orders table
ALTER TABLE public.orders
ADD COLUMN voucher_code TEXT,
ADD COLUMN voucher_discount NUMERIC DEFAULT 0;