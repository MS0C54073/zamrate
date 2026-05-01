ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.ratings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;