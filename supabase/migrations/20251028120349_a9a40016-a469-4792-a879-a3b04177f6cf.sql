-- Create supermarkets table
CREATE TABLE IF NOT EXISTS public.supermarkets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  accepts_meal_vouchers boolean NOT NULL DEFAULT false,
  meal_voucher_types jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supermarkets ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Supermarkets are viewable by everyone" 
ON public.supermarkets 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_supermarkets_updated_at
BEFORE UPDATE ON public.supermarkets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for existing stores
INSERT INTO public.supermarkets (name, address, city, accepts_meal_vouchers, meal_voucher_types) VALUES
  ('Esselunga', 'Via Tuscolana 123', 'Roma', true, '["Ticket Restaurant", "Edenred", "Day"]'::jsonb),
  ('Carrefour Express', 'Via Appia Nuova 45', 'Roma', true, '["Ticket Restaurant", "Edenred"]'::jsonb),
  ('Coop', 'Via dei Castani 67', 'Roma', false, '[]'::jsonb),
  ('Conad', 'Viale Manzoni 89', 'Roma', true, '["Ticket Restaurant", "Day"]'::jsonb),
  ('Lidl', 'Via Casilina 234', 'Roma', false, '[]'::jsonb),
  ('Esselunga', 'Viale Piave 10', 'Milano', true, '["Ticket Restaurant", "Edenred", "Day"]'::jsonb),
  ('Carrefour', 'Via Lorenteggio 251', 'Milano', true, '["Ticket Restaurant", "Edenred"]'::jsonb),
  ('Coop', 'Via Famagosta 75', 'Milano', false, '[]'::jsonb),
  ('Pam', 'Corso Buenos Aires 33', 'Milano', true, '["Ticket Restaurant"]'::jsonb),
  ('Iper', 'Via Rubattino 84', 'Milano', true, '["Ticket Restaurant", "Edenred", "Day"]'::jsonb),
  ('Eurospin', 'Via Corradini 34', 'Avezzano', false, '[]'::jsonb)
ON CONFLICT DO NOTHING;