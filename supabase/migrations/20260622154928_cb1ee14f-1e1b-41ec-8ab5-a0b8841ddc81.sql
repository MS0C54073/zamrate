
-- 1. Fix broken ownership check on ratings UPDATE
DROP POLICY IF EXISTS "Owner can update own rating" ON public.ratings;
CREATE POLICY "Owner can update own rating" ON public.ratings
  FOR UPDATE
  USING (anonymous_user_id = ((current_setting('request.headers', true))::json ->> 'x-anon-id'))
  WITH CHECK (anonymous_user_id = ((current_setting('request.headers', true))::json ->> 'x-anon-id'));

-- 2. Fix recommendation_votes ownership for UPDATE/DELETE
DROP POLICY IF EXISTS "Public update own vote" ON public.recommendation_votes;
DROP POLICY IF EXISTS "Public delete own vote" ON public.recommendation_votes;

CREATE POLICY "Owner can update own vote" ON public.recommendation_votes
  FOR UPDATE
  USING (anonymous_user_id = ((current_setting('request.headers', true))::json ->> 'x-anon-id'))
  WITH CHECK (anonymous_user_id = ((current_setting('request.headers', true))::json ->> 'x-anon-id'));

CREATE POLICY "Owner can delete own vote" ON public.recommendation_votes
  FOR DELETE
  USING (anonymous_user_id = ((current_setting('request.headers', true))::json ->> 'x-anon-id'));

-- 3. Hide email/phone from public on companies
DROP POLICY IF EXISTS "Public can view approved companies" ON public.companies;
CREATE POLICY "Public can view approved companies" ON public.companies
  FOR SELECT TO anon
  USING (status = 'approved' AND false); -- block direct anon SELECT; use view below

-- Re-allow signed-in (non-admin) users to view approved companies including contact details
CREATE POLICY "Authenticated can view approved companies" ON public.companies
  FOR SELECT TO authenticated
  USING (status = 'approved');

-- Public sanitized view (no email/phone)
CREATE OR REPLACE VIEW public.public_companies
WITH (security_invoker = true) AS
SELECT id, name, category, description, services, location, website, status, created_at, logo_url, updated_at
FROM public.companies
WHERE status = 'approved';

GRANT SELECT ON public.public_companies TO anon, authenticated;

-- 4. Hide anonymous_user_id on public ratings/comments via sanitized views
CREATE OR REPLACE VIEW public.public_ratings
WITH (security_invoker = true) AS
SELECT id, company_id, rating, rating_change_count, created_at, updated_at,
       encode(digest(anonymous_user_id || id::text, 'sha256'), 'hex') AS author_hash
FROM public.ratings;

CREATE OR REPLACE VIEW public.public_comments
WITH (security_invoker = true) AS
SELECT id, company_id, parent_comment_id, comment_text, status, created_at, report_count, deleted_at,
       encode(digest(anonymous_user_id || id::text, 'sha256'), 'hex') AS author_hash
FROM public.comments
WHERE status = 'approved';

-- pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

GRANT SELECT ON public.public_ratings TO anon, authenticated;
GRANT SELECT ON public.public_comments TO anon, authenticated;

-- Remove direct SELECT on raw anonymous_user_id from anon role on ratings/comments
DROP POLICY IF EXISTS "Public can view ratings" ON public.ratings;
CREATE POLICY "Authenticated can view ratings" ON public.ratings
  FOR SELECT TO authenticated USING (true);
-- (anon role gets data only through public_ratings view)

DROP POLICY IF EXISTS "Public can view approved comments" ON public.comments;
CREATE POLICY "Authenticated can view approved comments" ON public.comments
  FOR SELECT TO authenticated USING (status = 'approved');
-- (anon role gets data only through public_comments view)

-- 5. Lock down SECURITY DEFINER helper functions
-- Trigger functions: no role needs EXECUTE — triggers run regardless of grants.
REVOKE ALL ON FUNCTION public.check_and_log_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_rate_limit_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_comment_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_rating_rate_limit() FROM PUBLIC, anon, authenticated;

-- Helpers used inside RLS policies — restrict to roles that actually need them.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_tier(uuid) TO authenticated;

-- is_blocked is referenced in INSERT WITH CHECK for anonymous public submissions
REVOKE ALL ON FUNCTION public.is_blocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(text) TO anon, authenticated;
