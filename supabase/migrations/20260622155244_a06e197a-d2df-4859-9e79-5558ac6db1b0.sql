
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_admin_tier(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('super_admin','admin','sub_admin','moderator'))
$$;

CREATE OR REPLACE FUNCTION private.is_blocked(_anon_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.blocked_users
    WHERE anonymous_user_id = _anon_id AND status = 'active')
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_blocked(text) TO authenticated, anon;

-- admin_audit_logs
DROP POLICY IF EXISTS "Admins insert own logs" ON public.admin_audit_logs;
CREATE POLICY "Admins insert own logs" ON public.admin_audit_logs FOR INSERT TO authenticated
  WITH CHECK (private.is_admin_tier(auth.uid()) AND admin_id = auth.uid());
DROP POLICY IF EXISTS "Admins view logs" ON public.admin_audit_logs;
CREATE POLICY "Admins view logs" ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));

-- blocked_users
DROP POLICY IF EXISTS "Admins insert blocks" ON public.blocked_users;
CREATE POLICY "Admins insert blocks" ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update blocks" ON public.blocked_users;
CREATE POLICY "Admins update blocks" ON public.blocked_users FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view blocks" ON public.blocked_users;
CREATE POLICY "Admins view blocks" ON public.blocked_users FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Super admins delete blocks" ON public.blocked_users;
CREATE POLICY "Super admins delete blocks" ON public.blocked_users FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role));

-- comments
DROP POLICY IF EXISTS "Admins delete comments" ON public.comments;
CREATE POLICY "Admins delete comments" ON public.comments FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role) OR private.has_role(auth.uid(),'moderator'::public.app_role));
DROP POLICY IF EXISTS "Admins update comments" ON public.comments;
CREATE POLICY "Admins update comments" ON public.comments FOR UPDATE TO authenticated
  USING (private.is_admin_tier(auth.uid())) WITH CHECK (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins view all comments" ON public.comments;
CREATE POLICY "Admins view all comments" ON public.comments FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Public can insert comments" ON public.comments;
CREATE POLICY "Public can insert comments" ON public.comments FOR INSERT TO anon, authenticated
  WITH CHECK (length(comment_text) > 0 AND length(comment_text) <= 2000 AND NOT private.is_blocked(anonymous_user_id));

-- companies
DROP POLICY IF EXISTS "Admins delete companies" ON public.companies;
CREATE POLICY "Admins delete companies" ON public.companies FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Admins insert companies" ON public.companies;
CREATE POLICY "Admins insert companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update companies" ON public.companies;
CREATE POLICY "Admins update companies" ON public.companies FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Admins view all companies" ON public.companies;
CREATE POLICY "Admins view all companies" ON public.companies FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));

-- company_suggestions
DROP POLICY IF EXISTS "Admins delete suggestions" ON public.company_suggestions;
CREATE POLICY "Admins delete suggestions" ON public.company_suggestions FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update suggestions" ON public.company_suggestions;
CREATE POLICY "Admins update suggestions" ON public.company_suggestions FOR UPDATE TO authenticated
  USING (private.is_admin_tier(auth.uid())) WITH CHECK (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins view suggestions" ON public.company_suggestions;
CREATE POLICY "Admins view suggestions" ON public.company_suggestions FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Public can submit suggestions" ON public.company_suggestions;
CREATE POLICY "Public can submit suggestions" ON public.company_suggestions FOR INSERT TO anon, authenticated
  WITH CHECK (length(company_name) > 0 AND length(company_name) <= 200 AND NOT private.is_blocked(suggested_by_anonymous_user_id));

-- ratings
DROP POLICY IF EXISTS "Public can insert ratings" ON public.ratings;
CREATE POLICY "Public can insert ratings" ON public.ratings FOR INSERT TO anon, authenticated
  WITH CHECK (rating >= 1 AND rating <= 5 AND length(anonymous_user_id) >= 8 AND length(anonymous_user_id) <= 128 AND NOT private.is_blocked(anonymous_user_id));

-- recommendations
DROP POLICY IF EXISTS "Admins delete recommendations" ON public.recommendations;
CREATE POLICY "Admins delete recommendations" ON public.recommendations FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role) OR private.has_role(auth.uid(),'moderator'::public.app_role));
DROP POLICY IF EXISTS "Admins update recommendations" ON public.recommendations;
CREATE POLICY "Admins update recommendations" ON public.recommendations FOR UPDATE TO authenticated
  USING (private.is_admin_tier(auth.uid())) WITH CHECK (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins view all recommendations" ON public.recommendations;
CREATE POLICY "Admins view all recommendations" ON public.recommendations FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Public insert recommendations" ON public.recommendations;
CREATE POLICY "Public insert recommendations" ON public.recommendations FOR INSERT TO anon, authenticated
  WITH CHECK (length(title) >= 3 AND length(title) <= 200 AND length(body) >= 3 AND length(body) <= 2000 AND length(anonymous_user_id) >= 8 AND length(anonymous_user_id) <= 128 AND NOT private.is_blocked(anonymous_user_id));

-- recommendation_votes
DROP POLICY IF EXISTS "Public insert votes" ON public.recommendation_votes;
CREATE POLICY "Public insert votes" ON public.recommendation_votes FOR INSERT TO anon, authenticated
  WITH CHECK (length(anonymous_user_id) >= 8 AND length(anonymous_user_id) <= 128 AND NOT private.is_blocked(anonymous_user_id));

-- reported_comments
DROP POLICY IF EXISTS "Admins update reports" ON public.reported_comments;
CREATE POLICY "Admins update reports" ON public.reported_comments FOR UPDATE TO authenticated
  USING (private.is_admin_tier(auth.uid())) WITH CHECK (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins view reports" ON public.reported_comments;
CREATE POLICY "Admins view reports" ON public.reported_comments FOR SELECT TO authenticated
  USING (private.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Public can submit reports" ON public.reported_comments;
CREATE POLICY "Public can submit reports" ON public.reported_comments FOR INSERT TO anon, authenticated
  WITH CHECK (length(reason) > 0 AND length(reason) <= 500 AND length(reported_by_anonymous_user_id) >= 8 AND length(reported_by_anonymous_user_id) <= 128 AND NOT private.is_blocked(reported_by_anonymous_user_id));
DROP POLICY IF EXISTS "Super admins delete reports" ON public.reported_comments;
CREATE POLICY "Super admins delete reports" ON public.reported_comments FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins delete roles" ON public.user_roles;
CREATE POLICY "Super admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins insert roles" ON public.user_roles;
CREATE POLICY "Super admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins update roles" ON public.user_roles;
CREATE POLICY "Super admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'super_admin'::public.app_role));

-- storage objects
DROP POLICY IF EXISTS "Admins delete company logos" ON storage.objects;
CREATE POLICY "Admins delete company logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role)));
DROP POLICY IF EXISTS "Admins update company logos" ON storage.objects;
CREATE POLICY "Admins update company logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role)));
DROP POLICY IF EXISTS "Admins upload company logos" ON storage.objects;
CREATE POLICY "Admins upload company logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
    AND lower(storage.extension(name)) = ANY (ARRAY['png','jpg','jpeg','webp'])
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin_tier(uuid);
DROP FUNCTION IF EXISTS public.is_blocked(text);
