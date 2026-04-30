-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add 'pending' status support for comments by changing default behaviour:
-- Comments status values used: 'pending', 'approved', 'rejected'
-- Update RLS so admins can see and manage all.

-- Allow comments to start as 'pending' (we'll change client default).
-- Admin policies for comments:
CREATE POLICY "Admins view all comments" ON public.comments
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update comments" ON public.comments
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete comments" ON public.comments
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for companies:
CREATE POLICY "Admins view all companies" ON public.companies
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert companies" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update companies" ON public.companies
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete companies" ON public.companies
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for company_suggestions:
CREATE POLICY "Admins view suggestions" ON public.company_suggestions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update suggestions" ON public.company_suggestions
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete suggestions" ON public.company_suggestions
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Change default for new comments to 'pending' moderation
ALTER TABLE public.comments ALTER COLUMN status SET DEFAULT 'pending';
