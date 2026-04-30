-- 1. blocked_users (created BEFORE is_blocked function)
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_user_id text NOT NULL,
  reason text,
  blocked_by_admin_id uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS blocked_users_anon_active_idx
  ON public.blocked_users (anonymous_user_id) WHERE status = 'active';
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_admin_tier(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('super_admin','admin','sub_admin','moderator')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_blocked(_anon_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE anonymous_user_id = _anon_id AND status = 'active'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_blocked(text) FROM anon, authenticated;

-- 3. Extend companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4. Extend comments
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 5. blocked_users policies
CREATE POLICY "Admins view blocks" ON public.blocked_users
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Admins insert blocks" ON public.blocked_users
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update blocks" ON public.blocked_users
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete blocks" ON public.blocked_users
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- 6. reported_comments
CREATE TABLE IF NOT EXISTS public.reported_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reported_by_anonymous_user_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reported_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit reports" ON public.reported_comments
  FOR INSERT TO public WITH CHECK (
    length(reason) > 0 AND length(reason) <= 500
    AND length(reported_by_anonymous_user_id) BETWEEN 8 AND 128
    AND NOT public.is_blocked(reported_by_anonymous_user_id)
  );
CREATE POLICY "Admins view reports" ON public.reported_comments
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Admins update reports" ON public.reported_comments
  FOR UPDATE TO authenticated USING (public.is_admin_tier(auth.uid())) WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Super admins delete reports" ON public.reported_comments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.bump_report_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.comments SET report_count = report_count + 1 WHERE id = NEW.comment_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reported_comments_bump ON public.reported_comments;
CREATE TRIGGER reported_comments_bump AFTER INSERT ON public.reported_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_report_count();

-- 7. admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Admins insert own logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND admin_id = auth.uid());

-- 8. Tighten public insert policies (block listed users)
DROP POLICY IF EXISTS "Public can insert comments" ON public.comments;
CREATE POLICY "Public can insert comments" ON public.comments
  FOR INSERT TO public WITH CHECK (
    length(comment_text) > 0 AND length(comment_text) <= 2000
    AND NOT public.is_blocked(anonymous_user_id)
  );

DROP POLICY IF EXISTS "Public can insert ratings" ON public.ratings;
CREATE POLICY "Public can insert ratings" ON public.ratings
  FOR INSERT TO public WITH CHECK (
    rating BETWEEN 1 AND 5
    AND length(anonymous_user_id) BETWEEN 8 AND 128
    AND NOT public.is_blocked(anonymous_user_id)
  );

DROP POLICY IF EXISTS "Public can submit suggestions" ON public.company_suggestions;
CREATE POLICY "Public can submit suggestions" ON public.company_suggestions
  FOR INSERT TO public WITH CHECK (
    length(company_name) > 0 AND length(company_name) <= 200
    AND NOT public.is_blocked(suggested_by_anonymous_user_id)
  );

-- 9. Extend admin policies on existing tables
DROP POLICY IF EXISTS "Admins view all comments" ON public.comments;
CREATE POLICY "Admins view all comments" ON public.comments
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins update comments" ON public.comments;
CREATE POLICY "Admins update comments" ON public.comments
  FOR UPDATE TO authenticated USING (public.is_admin_tier(auth.uid())) WITH CHECK (public.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins delete comments" ON public.comments;
CREATE POLICY "Admins delete comments" ON public.comments
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'moderator')
  );

DROP POLICY IF EXISTS "Admins view all companies" ON public.companies;
CREATE POLICY "Admins view all companies" ON public.companies
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins insert companies" ON public.companies;
CREATE POLICY "Admins insert companies" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "Admins update companies" ON public.companies;
CREATE POLICY "Admins update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS "Admins delete companies" ON public.companies;
CREATE POLICY "Admins delete companies" ON public.companies
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins view suggestions" ON public.company_suggestions;
CREATE POLICY "Admins view suggestions" ON public.company_suggestions
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins update suggestions" ON public.company_suggestions;
CREATE POLICY "Admins update suggestions" ON public.company_suggestions
  FOR UPDATE TO authenticated USING (public.is_admin_tier(auth.uid())) WITH CHECK (public.is_admin_tier(auth.uid()));
DROP POLICY IF EXISTS "Admins delete suggestions" ON public.company_suggestions;
CREATE POLICY "Admins delete suggestions" ON public.company_suggestions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 10. Super admins manage user_roles
CREATE POLICY "Super admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- 11. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read company logos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'company-logos');
CREATE POLICY "Admins upload company logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'company-logos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp')
  );
CREATE POLICY "Admins update company logos" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'company-logos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );
CREATE POLICY "Admins delete company logos" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'company-logos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- 12. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS companies_touch ON public.companies;
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 13. Promote existing admin to super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::app_role FROM public.user_roles WHERE role = 'admin'
ON CONFLICT DO NOTHING;
