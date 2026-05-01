ALTER TABLE public.comments ALTER COLUMN status SET DEFAULT 'approved';
UPDATE public.comments SET status = 'approved' WHERE status = 'pending';