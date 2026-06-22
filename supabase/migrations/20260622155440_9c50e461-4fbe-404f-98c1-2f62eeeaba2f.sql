
REVOKE ALL ON FUNCTION public.check_and_log_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_rate_limit_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_comment_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_rating_rate_limit() FROM PUBLIC, anon, authenticated;
