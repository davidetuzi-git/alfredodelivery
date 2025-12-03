-- Create saved shopping lists table
CREATE TABLE public.saved_shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Lista salvata',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  store TEXT,
  delivery_address TEXT,
  address_coords JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_shopping_lists ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own lists
CREATE POLICY "Users can view their own saved lists"
  ON public.saved_shopping_lists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved lists"
  ON public.saved_shopping_lists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved lists"
  ON public.saved_shopping_lists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved lists"
  ON public.saved_shopping_lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_shopping_lists_updated_at
  BEFORE UPDATE ON public.saved_shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();