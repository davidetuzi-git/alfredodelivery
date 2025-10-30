-- Enable realtime for deliverers table to track position updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverers;