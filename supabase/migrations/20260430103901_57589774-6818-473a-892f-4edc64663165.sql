-- Companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  services text,
  location text,
  website text,
  phone text,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_companies_category ON public.companies(category);
CREATE INDEX idx_companies_status ON public.companies(status);

-- Ratings
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  anonymous_user_id text NOT NULL,
  rating smallint NOT NULL,
  rating_change_count smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, anonymous_user_id)
);
CREATE INDEX idx_ratings_company ON public.ratings(company_id);

-- Validation trigger for rating range and edit cap
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger
LANGUAGE plpgsql
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
CREATE TRIGGER trg_validate_rating
BEFORE INSERT OR UPDATE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  anonymous_user_id text NOT NULL,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_company ON public.comments(company_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);

-- Company suggestions
CREATE TABLE public.company_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  category text NOT NULL,
  description text,
  services text,
  suggested_by_anonymous_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_suggestions ENABLE ROW LEVEL SECURITY;

-- Companies: public read of approved, public insert (will go to pending if needed)
CREATE POLICY "Public can view approved companies" ON public.companies
  FOR SELECT USING (status = 'approved');

-- Ratings: public read, public insert/update (constrained by trigger + unique)
CREATE POLICY "Public can view ratings" ON public.ratings
  FOR SELECT USING (true);
CREATE POLICY "Public can insert ratings" ON public.ratings
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update ratings" ON public.ratings
  FOR UPDATE USING (true) WITH CHECK (true);

-- Comments: public read approved, public insert
CREATE POLICY "Public can view approved comments" ON public.comments
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Public can insert comments" ON public.comments
  FOR INSERT WITH CHECK (length(comment_text) > 0 AND length(comment_text) <= 2000);

-- Suggestions: public insert only (no public read for privacy)
CREATE POLICY "Public can submit suggestions" ON public.company_suggestions
  FOR INSERT WITH CHECK (length(company_name) > 0 AND length(company_name) <= 200);
