
-- Drop sanitized views (unused) and restore normal anon SELECT, then lock down sensitive columns.
DROP VIEW IF EXISTS public.public_companies;
DROP VIEW IF EXISTS public.public_ratings;
DROP VIEW IF EXISTS public.public_comments;

-- Restore public SELECT policies for anon (no more `AND false`)
DROP POLICY IF EXISTS "Public can view approved companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can view approved companies" ON public.companies;
CREATE POLICY "Public can view approved companies" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "Public can view ratings" ON public.ratings;
DROP POLICY IF EXISTS "Authenticated can view ratings" ON public.ratings;
CREATE POLICY "Public can view ratings" ON public.ratings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view approved comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated can view approved comments" ON public.comments;
CREATE POLICY "Public can view approved comments" ON public.comments
  FOR SELECT TO anon, authenticated USING (status = 'approved');

-- Column-level lockdown: anon must not be able to read PII / correlation fields.
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (id, name, category, description, services, location, website, status, created_at, logo_url, updated_at)
  ON public.companies TO anon;

REVOKE SELECT ON public.ratings FROM anon;
GRANT SELECT (id, company_id, rating, rating_change_count, created_at, updated_at)
  ON public.ratings TO anon;

REVOKE SELECT ON public.comments FROM anon;
GRANT SELECT (id, company_id, parent_comment_id, comment_text, status, created_at, report_count, deleted_at)
  ON public.comments TO anon;

-- Authenticated keeps full SELECT (admins still see everything; non-admin signed-in users
-- can still see contact details on approved companies — restrict further if needed).
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.ratings TO authenticated;
GRANT SELECT ON public.comments TO authenticated;
