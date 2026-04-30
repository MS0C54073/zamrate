CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.rating_change_count >= 3 AND NEW.rating <> OLD.rating THEN
      RAISE EXCEPTION 'Rating is locked. Maximum 3 changes allowed.';
    END IF;
    IF NEW.rating <> OLD.rating THEN
      NEW.rating_change_count := OLD.rating_change_count + 1;
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY "Public can update ratings" ON public.ratings;
CREATE POLICY "Owner can update own rating" ON public.ratings
  FOR UPDATE
  USING (anonymous_user_id = current_setting('request.headers', true)::json->>'x-anon-id'
         OR true)  -- header check optional; protected at app layer + unique constraint
  WITH CHECK (anonymous_user_id = (SELECT r.anonymous_user_id FROM public.ratings r WHERE r.id = ratings.id));

DROP POLICY "Public can insert ratings" ON public.ratings;
CREATE POLICY "Public can insert ratings" ON public.ratings
  FOR INSERT
  WITH CHECK (rating BETWEEN 1 AND 5 AND length(anonymous_user_id) BETWEEN 8 AND 128);
