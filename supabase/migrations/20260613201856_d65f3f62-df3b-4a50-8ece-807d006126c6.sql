-- Rate limiting infrastructure
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  anonymous_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_events TO service_role;
-- No anon/authenticated grants: only SECURITY DEFINER functions touch this table.

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_access" ON public.rate_limit_events FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON public.rate_limit_events (anonymous_user_id, action, created_at DESC);

-- Core enforcement function: raises if limit exceeded, otherwise records the event.
CREATE OR REPLACE FUNCTION public.check_and_log_rate_limit(
  _anon_id TEXT,
  _action TEXT,
  _max INT,
  _window_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  IF _anon_id IS NULL OR length(_anon_id) = 0 THEN
    RAISE EXCEPTION 'Anonymous identifier required';
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.rate_limit_events
  WHERE anonymous_user_id = _anon_id
    AND action = _action
    AND created_at > now() - (_window_seconds || ' seconds')::interval;

  IF recent_count >= _max THEN
    RAISE EXCEPTION 'Rate limit exceeded for %. Please slow down and try again shortly.', _action
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.rate_limit_events (anonymous_user_id, action)
  VALUES (_anon_id, _action);

  RETURN TRUE;
END;
$$;

-- Trigger functions per action type with two-tier (burst + sustained) limits.
CREATE OR REPLACE FUNCTION public.enforce_rating_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_and_log_rate_limit(NEW.anonymous_user_id, 'rating_burst', 10, 60);
  PERFORM public.check_and_log_rate_limit(NEW.anonymous_user_id, 'rating_hour', 100, 3600);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    PERFORM public.check_and_log_rate_limit(NEW.anonymous_user_id, 'comment_burst', 5, 60);
    PERFORM public.check_and_log_rate_limit(NEW.anonymous_user_id, 'comment_hour', 50, 3600);
  ELSE
    PERFORM public.check_and_log_rate_limit(NEW.anonymous_user_id, 'reply_burst', 10, 60);
    PERFORM public.check_and_log_rate_limit(NEW.anonymous_user_id, 'reply_hour', 100, 3600);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rate_limit_ratings ON public.ratings;
CREATE TRIGGER trg_rate_limit_ratings
  BEFORE INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rating_rate_limit();

DROP TRIGGER IF EXISTS trg_rate_limit_comments ON public.comments;
CREATE TRIGGER trg_rate_limit_comments
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_rate_limit();

-- Cleanup function: older than 24h is irrelevant for any window we enforce.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '24 hours';
$$;