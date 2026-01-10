-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  items_affected TEXT[], -- List of item names affected
  image_urls TEXT[], -- Array of image URLs
  status TEXT NOT NULL DEFAULT 'pending', -- pending, investigating, resolved, rejected
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Users can view their own complaints
CREATE POLICY "Users can view their own complaints"
ON public.complaints
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create complaints for their orders
CREATE POLICY "Users can create complaints"
ON public.complaints
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all complaints
CREATE POLICY "Admins can view all complaints"
ON public.complaints
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update complaints
CREATE POLICY "Admins can update complaints"
ON public.complaints
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for complaint images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-images', 'complaint-images', false);

-- Storage policies for complaint images
CREATE POLICY "Users can upload complaint images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own complaint images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all complaint images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'complaint-images' AND public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();